"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { documentAPI, summaryAPI, ragAPI } from "@/lib/api";
import type { Document as DocItem, ChatMessage } from "@/types";

/* ─── Type colours ─────────────────────────────────────────── */
const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pdf:      { label: "PDF", color: "#F7374F", bg: "rgba(247,55,79,0.12)"   },
  docx:     { label: "DOC", color: "#60A5FA", bg: "rgba(96,165,250,0.12)"  },
  ppt:      { label: "PPT", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  url:      { label: "URL", color: "#34D399", bg: "rgba(52,211,153,0.12)"  },
  image:    { label: "IMG", color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  txt:      { label: "TXT", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  raw_text: { label: "TXT", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
};

const OUTPUT_TYPES = [
  { id: "tldr",            label: "TL;DR"          },
  { id: "bullets",         label: "Bullets"         },
  { id: "key_insights",    label: "Key Insights"    },
  { id: "action_points",   label: "Action Points"   },
  { id: "section_summary", label: "Section View"    },
];

const FILTERS = ["All", "PDF", "DOCX", "URL", "PPT"];
const PAGE_SIZE = 10;

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function formatWords(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

/* ═══════════════════════════════════════════════════════════
   DOC CHAT / SUMMARY OVERLAY  (full-screen, ResultPanel style)
   ═══════════════════════════════════════════════════════════ */
function DocOverlay({ doc, onClose }: { doc: DocItem; onClose: () => void }) {
  const [mounted,   setMounted]   = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [tab,       setTab]       = useState<"summary" | "chat">("summary");
  const [activeType, setActiveType] = useState("bullets");

  // Summary
  const [summary,        setSummary]        = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError,   setSummaryError]   = useState("");
  const [visCount,       setVisCount]       = useState(0);

  // Chat
  const [messages,      setMessages]      = useState<ChatMessage[]>([]);
  const [chatLoading,   setChatLoading]   = useState(false);
  const [histLoading,   setHistLoading]   = useState(false);
  const [input,         setInput]         = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Enter anim
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  // Hide navbar + body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const nav = document.querySelector(".snx-nav") as HTMLElement | null;
    if (nav) nav.style.display = "none";
    return () => {
      document.body.style.overflow = "";
      if (nav) nav.style.display = "";
    };
  }, []);

  // Load summary
  useEffect(() => {
    setSummaryError(""); setSummaryLoading(true); setSummary(null); setVisCount(0);
    summaryAPI.create(doc._id, activeType)
      .then(res => setSummary(res.data.data))
      .catch(err => setSummaryError(err?.message || "Failed"))
      .finally(() => setSummaryLoading(false));
  }, [activeType, doc._id]);

  // Stream summary items in
  useEffect(() => {
    if (!summaryLoading && summary) {
      const items = Array.isArray(summary.content) ? summary.content : [summary.content];
      setVisCount(0);
      let c = 0;
      const iv = setInterval(() => {
        c++; setVisCount(c);
        if (c >= items.length) clearInterval(iv);
      }, 70);
      return () => clearInterval(iv);
    }
  }, [summaryLoading, summary]);

  // Load chat history
  useEffect(() => {
    if (tab !== "chat") return;
    setHistLoading(true);
    ragAPI.history(doc._id)
      .then(res => {
        const msgs = res.data.data?.messages ?? res.data.data ?? [];
        setMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch(() => setMessages([]))
      .finally(() => setHistLoading(false));
  }, [tab, doc._id]);

  // Auto scroll chat
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading]);

  const handleClose = () => { setClosing(true); setTimeout(onClose, 280); };

  const sendChat = async () => {
    if (!input.trim() || chatLoading) return;
    const q = input.trim(); setInput("");
    const userMsg: ChatMessage = { _id: Date.now().toString(), role: "user", content: q, sources: [], createdAt: new Date().toISOString() };
    setMessages(m => [...m, userMsg]);
    setChatLoading(true);
    try {
      const res = await ragAPI.chat(doc._id, q);
      const { answer, sources } = res.data.data;
      setMessages(m => [...m, { _id: (Date.now()+1).toString(), role: "assistant", content: answer, sources: sources ?? [], createdAt: new Date().toISOString() }]);
    } catch (err: any) {
      setMessages(m => [...m, { _id: (Date.now()+1).toString(), role: "assistant", content: err?.message || "Something went wrong.", sources: [], createdAt: new Date().toISOString() }]);
    } finally { setChatLoading(false); setTimeout(() => inputRef.current?.focus(), 50); }
  };

  const summaryItems: any[] = summary
    ? (Array.isArray(summary.content) ? summary.content : [summary.content])
    : [];

  const formatItem = (item: any) => {
    if (typeof item === "string") return item;
    if (item?.section && item?.summary) return `${item.section}: ${item.summary}`;
    if (item?.summary) return item.summary;
    return JSON.stringify(item);
  };

  const type = TYPE_CFG[doc.sourceType] ?? TYPE_CFG["txt"];
  const isOpen = mounted && !closing;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000000,
      background: "#000",
      display: "flex", flexDirection: "column",
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)",
    }}>
      <style>{`
        @keyframes ov-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ov-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ov-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes ov-dots  { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        .ov-item { animation: ov-in 0.22s cubic-bezier(0.22,1,0.36,1) both; }
        .ov-skel {
          border-radius:8px;
          background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%);
          background-size:600px 100%;
          animation:ov-shimmer 1.5s ease-in-out infinite;
        }
        .ov-dot { width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.3);animation:ov-dots 1.4s ease-in-out infinite; }
        .ov-tab-btn { transition:all 0.15s; }
        .ov-tab-btn:hover { color:rgba(255,255,255,0.7) !important; }
        .ov-close:hover { background:rgba(247,55,79,0.1) !important; border-color:rgba(247,55,79,0.3) !important; color:#F7374F !important; }
        .ov-send:not(:disabled):hover { background:#ff4f65 !important; }
        .ov-send:disabled { opacity:0.35; cursor:not-allowed; }
        .ov-scroll::-webkit-scrollbar { width:3px; }
        .ov-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:4px; }
        .ov-type-btn { transition:all 0.15s; }
        .ov-type-btn:hover { border-color:rgba(247,55,79,0.4) !important; color:rgba(255,255,255,0.7) !important; }
        .ov-chat-input:focus { border-color:rgba(247,55,79,0.45) !important; outline:none; }
        .ov-regen:hover { border-color:rgba(247,55,79,0.4) !important; color:#F7374F !important; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        flexShrink:0, height:"58px", display:"flex", alignItems:"center",
        justifyContent:"space-between",
        padding:"0 clamp(16px,4vw,48px)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Doc info */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
          <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:type.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke={type.color} strokeWidth="1.3"/>
              <path d="M10 1v4h4" stroke={type.color} strokeWidth="1.3"/>
            </svg>
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:"13px", fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"clamp(140px,30vw,400px)" }}>
              {doc.title}
            </p>
            <p style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)" }}>
              <span style={{ padding:"1px 6px", borderRadius:"4px", background:type.bg, color:type.color, fontWeight:700, fontSize:"9px", marginRight:"6px" }}>{type.label}</span>
              {doc.wordCount > 0 ? `${formatWords(doc.wordCount)} words` : "Processing"}
              {doc.pageCount ? ` · ${doc.pageCount}p` : ""}
            </p>
          </div>
        </div>

        {/* Tabs + close */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
          {/* Tab switcher */}
          <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:"10px", padding:"3px", gap:"2px" }}>
            {(["summary","chat"] as const).map(t => (
              <button key={t} className="ov-tab-btn" onClick={() => setTab(t)} style={{
                padding:"6px 14px", borderRadius:"7px", border:"none", cursor:"pointer",
                fontSize:"12px", fontWeight: tab===t ? 600 : 400,
                background: tab===t ? "rgba(247,55,79,0.18)" : "transparent",
                color: tab===t ? "#F7374F" : "rgba(255,255,255,0.35)",
              }}>
                {t === "summary" ? "Summary" : "Chat"}
              </button>
            ))}
          </div>
          {/* Close */}
          <button className="ov-close" onClick={handleClose} style={{
            width:"36px", height:"36px", borderRadius:"10px",
            border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(255,255,255,0.45)", transition:"all 0.15s",
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── SUMMARY TAB ── */}
      {tab === "summary" && (
        <div className="ov-scroll" style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
          <div style={{ maxWidth:"720px", width:"100%", margin:"0 auto", padding:"clamp(24px,5vh,52px) clamp(16px,4vw,40px) 60px" }}>

            {/* Output type pills */}
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"32px" }}>
              {OUTPUT_TYPES.map(o => (
                <button key={o.id} className="ov-type-btn" onClick={() => setActiveType(o.id)} style={{
                  padding:"6px 16px", borderRadius:"20px", cursor:"pointer", fontSize:"12px",
                  border: activeType===o.id ? "1px solid rgba(247,55,79,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: activeType===o.id ? "rgba(247,55,79,0.15)" : "transparent",
                  color: activeType===o.id ? "#F7374F" : "rgba(255,255,255,0.35)",
                  fontWeight: activeType===o.id ? 600 : 400, transition:"all 0.15s",
                }}>{o.label}</button>
              ))}
            </div>

            <p style={{ fontSize:"11px", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", marginBottom:"20px" }}>
              {OUTPUT_TYPES.find(o => o.id === activeType)?.label}
            </p>

            {/* Loading */}
            {summaryLoading && (
              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                {[88,72,80,60,85,68,76,55].map((w,i) => (
                  <div key={i} className="ov-skel" style={{ height:"17px", width:`${w}%`, animationDelay:`${i*0.07}s` }} />
                ))}
              </div>
            )}

            {/* Error */}
            {summaryError && !summaryLoading && (
              <p style={{ color:"#f87171", fontSize:"13px" }}>{summaryError}</p>
            )}

            {/* Items */}
            {!summaryLoading && !summaryError && summaryItems.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column" }}>
                {summaryItems.slice(0, visCount).map((item,i) => (
                  <div key={i} className="ov-item" style={{
                    animationDelay:`${i*0.04}s`,
                    display:"flex", gap:"14px",
                    padding:"15px 0",
                    borderBottom: i < visCount-1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    alignItems:"flex-start",
                  }}>
                    <div style={{ width:"22px", height:"22px", borderRadius:"6px", background:"rgba(247,55,79,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"3px" }}>
                      <span style={{ fontSize:"9px", fontWeight:700, color:"#F7374F" }}>{i+1}</span>
                    </div>
                    <p style={{ fontSize:"clamp(14px,1.8vw,16px)", color:"rgba(255,255,255,0.82)", lineHeight:1.75, margin:0 }}>
                      {formatItem(item)}
                    </p>
                  </div>
                ))}
                {visCount > 0 && visCount < summaryItems.length && (
                  <div style={{ width:"7px", height:"17px", borderRadius:"2px", background:"#F7374F", marginTop:"16px", animation:"ov-blink 0.7s ease-in-out infinite" }} />
                )}
              </div>
            )}

            {/* Regenerate */}
            {!summaryLoading && (
              <button className="ov-regen" onClick={() => {
                setSummary(null); setSummaryError(""); setSummaryLoading(true); setVisCount(0);
                summaryAPI.create(doc._id, activeType)
                  .then(r => setSummary(r.data.data))
                  .catch(e => setSummaryError(e?.message || "Failed"))
                  .finally(() => setSummaryLoading(false));
              }} style={{
                marginTop:"28px", padding:"9px 20px", borderRadius:"10px",
                border:"1px solid rgba(255,255,255,0.08)", background:"transparent",
                color:"rgba(255,255,255,0.3)", fontSize:"12px", cursor:"pointer",
                transition:"all 0.15s",
              }}>
                ↺ Regenerate
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CHAT TAB ── */}
      {tab === "chat" && (
        <>
          <div className="ov-scroll" style={{ flex:1, overflowY:"auto" }}>
            <div style={{ maxWidth:"720px", width:"100%", margin:"0 auto", padding:"clamp(20px,4vh,40px) clamp(16px,4vw,40px) 20px", display:"flex", flexDirection:"column", gap:"14px" }}>

              {/* RAG badge */}
              <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
                <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#34D399", boxShadow:"0 0 6px #34D399" }} />
                <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>RAG enabled · Semantic retrieval active</span>
              </div>

              {histLoading && <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.2)", textAlign:"center" }}>Loading history…</p>}

              {!histLoading && messages.length === 0 && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px", padding:"24px 0", opacity:0.4 }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M4 6h20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 3V7a1 1 0 0 1 1-1z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4"/>
                  </svg>
                  <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)", textAlign:"center" }}>Ask anything about this document</p>
                </div>
              )}

              {messages.map(m => {
                const isUser = m.role === "user";
                return (
                  <div key={m._id} className="ov-item" style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                    {!isUser && (
                      <div style={{ width:"28px", height:"28px", borderRadius:"8px", background:"rgba(247,55,79,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginRight:"10px", marginTop:"2px" }}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M1.5 2.5h9M1.5 6h6.5M1.5 9.5h4" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}
                    <div style={{ maxWidth:"76%", display:"flex", flexDirection:"column", gap:"5px", alignItems: isUser ? "flex-end" : "flex-start" }}>
                      <div style={{
                        padding:"11px 16px",
                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: isUser ? "#F7374F" : "rgba(255,255,255,0.06)",
                        border: isUser ? "none" : "1px solid rgba(255,255,255,0.07)",
                        fontSize:"14px", color: isUser ? "#fff" : "rgba(255,255,255,0.82)", lineHeight:1.65,
                      }}>
                        {m.content}
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                          {m.sources.map((s: any,i: number) => (
                            <span key={i} title={s.chunkText} style={{ fontSize:"10px", padding:"2px 7px", borderRadius:"4px", background:"rgba(96,165,250,0.1)", color:"#60A5FA", cursor:"default" }}>
                              src · {Math.round(s.score*100)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {chatLoading && (
                <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{ width:"28px", height:"28px", borderRadius:"8px", background:"rgba(247,55,79,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1.5 2.5h9M1.5 6h6.5M1.5 9.5h4" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ display:"flex", gap:"5px", padding:"12px 16px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px 16px 16px 4px", alignItems:"center" }}>
                    {[0,1,2].map(i => <div key={i} className="ov-dot" style={{ animationDelay:`${i*0.18}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Chat input */}
          <div style={{ flexShrink:0, borderTop:"1px solid rgba(255,255,255,0.06)", background:"#000", padding:"clamp(10px,2vh,16px) clamp(16px,4vw,48px)", paddingBottom:"max(clamp(10px,2vh,16px), env(safe-area-inset-bottom,0px))" }}>
            <div style={{ maxWidth:"720px", margin:"0 auto", display:"flex", gap:"10px", alignItems:"center" }}>
              <input ref={inputRef} className="ov-chat-input" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Ask anything about this document…"
                disabled={chatLoading}
                style={{ flex:1, padding:"12px 18px", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.04)", color:"white", fontSize:"14px", transition:"border-color 0.15s" }}
              />
              <button className="ov-send" onClick={sendChat} disabled={!input.trim() || chatLoading}
                style={{ width:"44px", height:"44px", borderRadius:"12px", border:"none", background:"#F7374F", boxShadow:"0 0 18px rgba(247,55,79,0.35)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}>
                {chatLoading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation:"ov-blink 0.8s ease-in-out infinite" }}>
                    <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                    <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 13V3M4 7l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DOCUMENT ROW  (table-row style, not card)
   ═══════════════════════════════════════════════════════════ */
function DocRow({ doc, onOpen, index }: { doc: DocItem; onOpen: () => void; index: number }) {
  const type    = TYPE_CFG[doc.sourceType] ?? TYPE_CFG["txt"];
  const isReady = doc.status === "ready";

  return (
    <>
      <style>{`
        .doc-row {
          display:grid;
          grid-template-columns: 32px 1fr auto auto auto;
          gap:0 16px;
          align-items:center;
          padding:14px 20px;
          border-bottom:1px solid rgba(255,255,255,0.04);
          cursor:${isReady ? "pointer" : "default"};
          transition:background 0.15s;
          animation: row-in 0.35s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay:${index * 0.04}s;
        }
        @keyframes row-in {
          from{opacity:0;transform:translateX(-8px)}
          to{opacity:1;transform:translateX(0)}
        }
        .doc-row:last-child { border-bottom:none; }
        .doc-row:hover { background:${isReady ? "rgba(255,255,255,0.03)" : "transparent"}; }
        .doc-row-open { opacity:0; transition:opacity 0.15s; font-size:11px; font-weight:600; color:#F7374F; display:flex; align-items:center; gap:4px; }
        .doc-row:hover .doc-row-open { opacity:${isReady ? "1" : "0"}; }
      `}</style>

      <div className="doc-row" onClick={() => isReady && onOpen()}>
        {/* Icon */}
        <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:type.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke={type.color} strokeWidth="1.3"/>
            <path d="M10 1v4h4" stroke={type.color} strokeWidth="1.3"/>
          </svg>
        </div>

        {/* Title + meta */}
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:"13px", fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:"2px" }}>
            {doc.title}
          </p>
          <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.22)" }}>
            {doc.wordCount > 0 ? `${formatWords(doc.wordCount)} words` : "Extracting…"}
            {doc.pageCount ? ` · ${doc.pageCount}p` : ""}
            {(doc.summaryCount ?? 0) > 0 ? ` · ${doc.summaryCount} summar${doc.summaryCount === 1 ? "y" : "ies"}` : ""}
          </p>
        </div>

        {/* Type badge */}
        <span style={{ fontSize:"9px", fontWeight:700, padding:"2px 8px", borderRadius:"5px", background:type.bg, color:type.color, letterSpacing:"0.8px", flexShrink:0, display:"none" }} className="doc-type-badge">
          {type.label}
        </span>

        {/* Date */}
        <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.18)", flexShrink:0, whiteSpace:"nowrap" }}>
          {formatDate(doc.createdAt)}
        </span>

        {/* Status / open */}
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:"8px", minWidth:"80px", justifyContent:"flex-end" }}>
          {isReady ? (
            <span className="doc-row-open">
              Open
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5h7M6 2.5l3 3-3 3" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          ) : (
            <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"20px", background:"rgba(251,191,36,0.09)", color:"#FBB724" }}>Processing</span>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function LibraryPage() {
  const [filter,    setFilter]    = useState("All");
  const [search,    setSearch]    = useState("");
  const [docs,      setDocs]      = useState<DocItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [visible,   setVisible]   = useState(PAGE_SIZE);
  const [activeDoc, setActiveDoc] = useState<DocItem | null>(null);
  const router = useRouter();

  useEffect(() => {
    documentAPI.list(1, 100)
      .then(res => setDocs(res.data.data ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const totalDocs      = docs.length;
  const totalSummaries = docs.reduce((a, d) => a + (d.summaryCount ?? 0), 0);

  const filtered = docs.filter(d => {
    const matchType   = filter === "All" || d.sourceType.toLowerCase() === filter.toLowerCase();
    const matchSearch = search === "" || d.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const shown = filtered.slice(0, visible);

  return (
    <>
      {activeDoc && <DocOverlay doc={activeDoc} onClose={() => setActiveDoc(null)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;700&display=swap');
        @keyframes lib-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .lib-up-1{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.04s both}
        .lib-up-2{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.12s both}
        .lib-up-3{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.20s both}

        .lib-search { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:9px 13px 9px 38px; font-size:13px; color:rgba(255,255,255,0.8); outline:none; width:100%; transition:border-color 0.18s,background 0.18s; }
        .lib-search::placeholder{color:rgba(255,255,255,0.22);}
        .lib-search:focus{border-color:rgba(247,55,79,0.4);background:rgba(255,255,255,0.05);}

        .lib-chip{padding:5px 13px;border-radius:7px;border:none;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.12s,color 0.12s;}
        .lib-chip-off{background:transparent;color:rgba(255,255,255,0.3);}
        .lib-chip-off:hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.65);}
        .lib-chip-on{background:rgba(247,55,79,0.85);color:#fff;font-weight:600;}

        .lib-cta:hover{border-color:rgba(247,55,79,0.5)!important;background:linear-gradient(140deg,rgba(247,55,79,0.2) 0%,rgba(247,55,79,0.06) 100%)!important;transform:translateY(-2px);box-shadow:0 12px 40px rgba(247,55,79,0.12)!important;}
        .lib-cta:active{transform:scale(0.98)!important;}

        .lib-more:hover{background:rgba(255,255,255,0.06)!important;border-color:rgba(255,255,255,0.15)!important;color:rgba(255,255,255,0.8)!important;}

        /* doc-type-badge visible on wider screens */
        @media(min-width:600px){ .doc-type-badge{display:inline!important;} }
        @media(max-width:480px){
          .doc-row{grid-template-columns:28px 1fr auto!important;}
          .doc-row > *:nth-child(4){display:none;}
        }
      `}</style>

      <div style={{ maxWidth:"1060px", margin:"0 auto", padding:"clamp(24px,4vw,44px) clamp(16px,3vw,28px) 60px" }}>

        {/* ── HEADER ── */}
        <div className="lib-up-1" style={{ marginBottom:"28px" }}>
          <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:"#F7374F", opacity:0.8, marginBottom:"8px" }}>
            Your Workspace
          </p>
          <h1 style={{ fontFamily:"'Josefin Sans','Arial Black',sans-serif", fontSize:"clamp(26px,4vw,42px)", fontWeight:700, color:"#fff", letterSpacing:"1px", lineHeight:1.05, textTransform:"uppercase", marginBottom:"6px" }}>
            Document Library
          </h1>
          <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.28)", lineHeight:1.6 }}>
            All your summaries and documents, organized in one place.
          </p>
        </div>

        {/* ── STAT CARDS ROW ── */}
        <div className="lib-up-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1.3fr", gap:"12px", marginBottom:"24px" }}>

          {/* Total Docs */}
          <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"clamp(14px,2.5vw,20px) clamp(14px,2.5vw,22px)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
              <span style={{ fontSize:"10px", fontWeight:500, letterSpacing:"0.8px", textTransform:"uppercase", color:"rgba(255,255,255,0.25)" }}>Docs</span>
              <div style={{ width:"28px", height:"28px", borderRadius:"7px", background:"rgba(247,55,79,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke="#F7374F" strokeWidth="1.3"/>
                  <path d="M10 1v4h4" stroke="#F7374F" strokeWidth="1.3"/>
                </svg>
              </div>
            </div>
            <div style={{ fontFamily:"'Josefin Sans','Arial Black',sans-serif", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, color:"#fff", lineHeight:1, letterSpacing:"1px" }}>
              {loading ? "—" : totalDocs}
            </div>
          </div>

          {/* Summaries */}
          <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"clamp(14px,2.5vw,20px) clamp(14px,2.5vw,22px)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
              <span style={{ fontSize:"10px", fontWeight:500, letterSpacing:"0.8px", textTransform:"uppercase", color:"rgba(255,255,255,0.25)" }}>Summaries</span>
              <div style={{ width:"28px", height:"28px", borderRadius:"7px", background:"rgba(167,139,250,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#A78BFA" strokeWidth="1.3"/>
                  <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div style={{ fontFamily:"'Josefin Sans','Arial Black',sans-serif", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, color:"#fff", lineHeight:1, letterSpacing:"1px" }}>
              {loading ? "—" : totalSummaries}
            </div>
          </div>

          {/* New Summary CTA */}
          <div className="lib-cta" onClick={() => router.push("/")}
            style={{ background:"linear-gradient(140deg,rgba(247,55,79,0.1) 0%,rgba(247,55,79,0.03) 100%)", border:"1px solid rgba(247,55,79,0.2)", borderRadius:"14px", padding:"clamp(14px,2.5vw,20px) clamp(14px,2.5vw,22px)", cursor:"pointer", transition:"all 0.2s", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
              <div style={{ width:"34px", height:"34px", borderRadius:"10px", background:"#F7374F", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 18px rgba(247,55,79,0.4)", flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={{ fontFamily:"'Josefin Sans','Arial Black',sans-serif", fontSize:"clamp(14px,2vw,18px)", fontWeight:700, color:"#fff", letterSpacing:"0.5px", textTransform:"uppercase", lineHeight:1.1 }}>
                New Summary
              </p>
            </div>
            <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.32)", lineHeight:1.55, marginBottom:"10px" }}>
              Upload a doc, paste a URL, or drop an image.
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"11px", fontWeight:700, color:"#F7374F" }}>
              Start now
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── LIBRARY TABLE ── */}
        <div className="lib-up-3" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"18px", overflow:"hidden" }}>

          {/* Toolbar */}
          <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
            {/* Search */}
            <div style={{ position:"relative", flex:"1", minWidth:"160px", maxWidth:"280px" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                style={{ position:"absolute", left:"11px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                <circle cx="6.5" cy="6.5" r="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
                <path d="M10 10l3 3" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input className="lib-search" type="text" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setVisible(PAGE_SIZE); }} />
            </div>

            <div style={{ flex:1 }} />

            {/* Filter chips */}
            <div style={{ display:"flex", gap:"2px", background:"rgba(255,255,255,0.03)", borderRadius:"9px", padding:"3px" }}>
              {FILTERS.map(f => (
                <button key={f} className={`lib-chip ${filter===f ? "lib-chip-on" : "lib-chip-off"}`}
                  onClick={() => { setFilter(f); setVisible(PAGE_SIZE); }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table header */}
          <div style={{ padding:"10px 20px 6px", display:"grid", gridTemplateColumns:"32px 1fr auto auto auto", gap:"0 16px", alignItems:"center", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div/>
            <span style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.8px", textTransform:"uppercase", color:"rgba(255,255,255,0.18)" }}>Document</span>
            <span style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.8px", textTransform:"uppercase", color:"rgba(255,255,255,0.18)" }}>Type</span>
            <span style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.8px", textTransform:"uppercase", color:"rgba(255,255,255,0.18)", whiteSpace:"nowrap" }}>Added</span>
            <div style={{ minWidth:"80px" }}/>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"0" }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", gap:"14px", alignItems:"center" }}>
                  <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"rgba(255,255,255,0.05)" }} />
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"6px" }}>
                    <div style={{ height:"13px", borderRadius:"5px", background:"rgba(255,255,255,0.05)", width:`${55+i*12}%` }} />
                    <div style={{ height:"10px", borderRadius:"5px", background:"rgba(255,255,255,0.03)", width:"30%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : shown.length > 0 ? (
            <>
              {shown.map((doc, i) => (
                <DocRow key={doc._id} doc={doc} index={i} onOpen={() => setActiveDoc(doc)} />
              ))}

              {/* View more / count */}
              <div style={{ padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.18)" }}>
                  {shown.length} of {filtered.length} document{filtered.length !== 1 ? "s" : ""}
                </span>
                {visible < filtered.length && (
                  <button className="lib-more" onClick={() => setVisible(v => v + PAGE_SIZE)}
                    style={{ padding:"7px 18px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"rgba(255,255,255,0.4)", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", transition:"all 0.15s" }}>
                    View {Math.min(PAGE_SIZE, filtered.length - visible)} more
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M5.5 2v7M2.5 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"52px 24px", gap:"10px" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
                <path d="M10 16h12M10 11h12M10 21h7" stroke="rgba(255,255,255,0.1)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.18)", textAlign:"center" }}>No documents match your filter.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}