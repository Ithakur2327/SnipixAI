"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { documentAPI, summaryAPI, ragAPI } from "@/lib/api";
import type { Document as DocItem, ChatMessage } from "@/types";

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
  { id: "tldr",            label: "TL;DR"        },
  { id: "bullets",         label: "Bullets"       },
  { id: "key_insights",    label: "Key Insights"  },
  { id: "action_points",   label: "Action Points" },
  { id: "section_summary", label: "Section View"  },
];

const FILTERS   = ["All", "PDF", "DOCX", "URL", "PPT"];
const PAGE_SIZE = 10;

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function formatWords(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

/* ─── internal message shape (wraps ChatMessage + synthetic summary msg) ── */
interface DisplayMsg {
  id: string;
  role: "user" | "assistant";
  content: string | string[];   // string[] = summary bullet list
  isSummary?: boolean;
  outputTypeLabel?: string;
  sources?: any[];
}

/* ═══════════════════════════════════════════════════════════
   FULL-SCREEN OVERLAY  — unified chat + summary
   ═══════════════════════════════════════════════════════════ */
function DocOverlay({ doc, onClose }: { doc: DocItem; onClose: () => void }) {
  const [mounted,  setMounted]  = useState(false);
  const [closing,  setClosing]  = useState(false);
  const [activeType, setActiveType] = useState("bullets");

  /* summary state */
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError,   setSummaryError]   = useState("");
  const [visCount,       setVisCount]       = useState(0);
  const [summaryItems,   setSummaryItems]   = useState<any[]>([]);

  /* chat state */
  const [messages,    setMessages]    = useState<DisplayMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [histLoaded,  setHistLoaded]  = useState(false);
  const [input,       setInput]       = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  /* enter animation */
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  /* hide navbar + lock scroll + remove layout paddingTop */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    // hide navbar
    const nav = document.querySelector(".snx-nav") as HTMLElement | null;
    if (nav) nav.style.display = "none";
    // remove the layout's paddingTop so overlay starts at top of viewport
    const main = document.querySelector("main") as HTMLElement | null;
    const prevPad = main ? main.style.paddingTop : "";
    if (main) main.style.paddingTop = "0";
    return () => {
      document.body.style.overflow = "";
      if (nav) nav.style.display = "";
      if (main) main.style.paddingTop = prevPad;
    };
  }, []);

  /* load summary whenever output type changes */
  useEffect(() => {
    setSummaryError(""); setSummaryLoading(true); setSummaryItems([]); setVisCount(0);
    summaryAPI.create(doc._id, activeType)
      .then(res => {
        const data = res.data.data;
        const items: any[] = Array.isArray(data?.content) ? data.content : [data?.content];
        setSummaryItems(items);
      })
      .catch(err => setSummaryError(err?.message || "Failed to generate summary"))
      .finally(() => setSummaryLoading(false));
  }, [activeType, doc._id]);

  /* stream summary bullets in */
  useEffect(() => {
    if (!summaryLoading && summaryItems.length > 0) {
      setVisCount(0);
      let c = 0;
      const iv = setInterval(() => {
        c++; setVisCount(c);
        if (c >= summaryItems.length) clearInterval(iv);
      }, 65);
      return () => clearInterval(iv);
    }
  }, [summaryLoading, summaryItems]);

  /* load chat history once (on mount) */
  useEffect(() => {
    ragAPI.history(doc._id)
      .then(res => {
        const raw = res.data.data?.messages ?? res.data.data ?? [];
        const msgs: DisplayMsg[] = (Array.isArray(raw) ? raw : []).map((m: any) => ({
          id: m._id ?? String(Date.now() + Math.random()),
          role: m.role,
          content: m.content,
          sources: m.sources ?? [],
        }));
        setMessages(msgs);
      })
      .catch(() => {})
      .finally(() => setHistLoaded(true));
  }, [doc._id]);

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, visCount]);

  const handleClose = () => { setClosing(true); setTimeout(onClose, 280); };

  const sendChat = async () => {
    if (!input.trim() || chatLoading) return;
    const q = input.trim(); setInput("");
    const userMsg: DisplayMsg = { id: Date.now().toString(), role: "user", content: q };
    setMessages(m => [...m, userMsg]);
    setChatLoading(true);
    try {
      const res = await ragAPI.chat(doc._id, q);
      const { answer, sources } = res.data.data;
      setMessages(m => [...m, {
        id: (Date.now()+1).toString(),
        role: "assistant", content: answer,
        sources: sources ?? [],
      }]);
    } catch (err: any) {
      setMessages(m => [...m, {
        id: (Date.now()+1).toString(),
        role: "assistant", content: err?.message || "Something went wrong.",
        sources: [],
      }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const formatItem = (item: any): string => {
    if (typeof item === "string") return item;
    if (item?.section && item?.summary) return `${item.section}: ${item.summary}`;
    if (item?.summary) return item.summary;
    return JSON.stringify(item);
  };

  const type   = TYPE_CFG[doc.sourceType] ?? TYPE_CFG["txt"];
  const isOpen = mounted && !closing;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000000,
      background:"#000", display:"flex", flexDirection:"column",
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? "translateY(0)" : "translateY(16px)",
      transition:"opacity 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)",
    }}>
      <style>{`
        @keyframes ov-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ov-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ov-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes ov-dots  { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        .ov-item  { animation: ov-in 0.2s cubic-bezier(0.22,1,0.36,1) both; }
        .ov-skel  { border-radius:6px; background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:600px 100%; animation:ov-shimmer 1.5s ease-in-out infinite; }
        .ov-dot   { width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.3);animation:ov-dots 1.4s ease-in-out infinite; }
        .ov-close:hover { background:rgba(247,55,79,0.1)!important; border-color:rgba(247,55,79,0.3)!important; color:#F7374F!important; }
        .ov-send:not(:disabled):hover { background:#ff4f65!important; box-shadow:0 0 24px rgba(247,55,79,0.5)!important; }
        .ov-send:disabled { opacity:0.3; cursor:not-allowed; }
        .ov-chat-input:focus { border-color:rgba(247,55,79,0.45)!important; outline:none; }
        .ov-type:hover { border-color:rgba(247,55,79,0.4)!important; color:rgba(255,255,255,0.7)!important; }
        .ov-scroll::-webkit-scrollbar { width:3px; }
        .ov-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); border-radius:4px; }
        .ov-regen:hover { border-color:rgba(247,55,79,0.4)!important; color:#F7374F!important; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        flexShrink:0, height:"56px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 clamp(14px,4vw,44px)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        gap:"10px",
      }}>
        {/* Left: doc icon + title */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0, flex:1 }}>
          <div style={{ width:"28px", height:"28px", borderRadius:"7px", background:type.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke={type.color} strokeWidth="1.3"/>
              <path d="M10 1v4h4" stroke={type.color} strokeWidth="1.3"/>
            </svg>
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:"13px", fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"clamp(120px,35vw,480px)" }}>
              {doc.title}
            </p>
            <p style={{ fontSize:"10px", color:"rgba(255,255,255,0.28)" }}>
              <span style={{ padding:"1px 5px", borderRadius:"3px", background:type.bg, color:type.color, fontWeight:700, fontSize:"8px", marginRight:"5px", letterSpacing:"0.5px" }}>{type.label}</span>
              {doc.wordCount > 0 ? `${formatWords(doc.wordCount)} words` : "Processing"}
              {doc.pageCount ? ` · ${doc.pageCount}p` : ""}
            </p>
          </div>
        </div>

        {/* Right: RAG badge + close */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"20px", background:"rgba(52,211,153,0.07)", border:"1px solid rgba(52,211,153,0.15)" }}>
            <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#34D399", boxShadow:"0 0 5px #34D399" }} />
            <span style={{ fontSize:"10px", color:"rgba(52,211,153,0.8)", fontWeight:600 }}>RAG</span>
          </div>
          <button className="ov-close" onClick={handleClose} style={{
            width:"34px", height:"34px", borderRadius:"9px",
            border:"1px solid rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.03)",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(255,255,255,0.4)", transition:"all 0.15s", flexShrink:0,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── OUTPUT TYPE PILLS ── */}
      <div style={{
        flexShrink:0, padding:"10px clamp(14px,4vw,44px)",
        borderBottom:"1px solid rgba(255,255,255,0.05)",
        display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center",
        background:"rgba(255,255,255,0.01)",
      }}>
        <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.2)", fontWeight:600, marginRight:"4px" }}>Format:</span>
        {OUTPUT_TYPES.map(o => (
          <button key={o.id} className="ov-type" onClick={() => setActiveType(o.id)} style={{
            padding:"4px 12px", borderRadius:"16px", cursor:"pointer", fontSize:"11px",
            border: activeType===o.id ? "1px solid rgba(247,55,79,0.5)" : "1px solid rgba(255,255,255,0.07)",
            background: activeType===o.id ? "rgba(247,55,79,0.15)" : "transparent",
            color: activeType===o.id ? "#F7374F" : "rgba(255,255,255,0.3)",
            fontWeight: activeType===o.id ? 600 : 400, transition:"all 0.15s",
          }}>{o.label}</button>
        ))}
      </div>

      {/* ── UNIFIED SCROLL AREA ── */}
      <div className="ov-scroll" style={{ flex:1, overflowY:"auto" }}>
        <div style={{
          maxWidth:"720px", width:"100%", margin:"0 auto",
          padding:"clamp(20px,4vh,40px) clamp(14px,4vw,40px) 24px",
          display:"flex", flexDirection:"column", gap:"0",
        }}>

          {/* ── SUMMARY BLOCK (always first, top of chat) ── */}
          <div style={{
            marginBottom:"32px",
            paddingBottom:"28px",
            borderBottom:"1px solid rgba(255,255,255,0.05)",
          }}>
            {/* AI avatar row */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
              <div style={{ width:"26px", height:"26px", borderRadius:"7px", background:"rgba(247,55,79,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 2.5h9M1.5 6h6.5M1.5 9.5h4" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{ fontSize:"11px", fontWeight:600, color:"rgba(255,255,255,0.35)" }}>
                SnipixAI
              </span>
              <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.15)", padding:"2px 7px", borderRadius:"4px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                {OUTPUT_TYPES.find(o => o.id === activeType)?.label}
              </span>
              {summaryLoading && (
                <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                  <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#FBB724", animation:"ov-blink 1s ease-in-out infinite" }} />
                  <span style={{ fontSize:"10px", color:"#FBB724" }}>Generating…</span>
                </div>
              )}
            </div>

            {/* Loading skeletons */}
            {summaryLoading && (
              <div style={{ display:"flex", flexDirection:"column", gap:"12px", paddingLeft:"34px" }}>
                {[85,70,78,58,82,65].map((w,i) => (
                  <div key={i} className="ov-skel" style={{ height:"16px", width:`${w}%`, animationDelay:`${i*0.07}s` }} />
                ))}
              </div>
            )}

            {/* Error */}
            {summaryError && !summaryLoading && (
              <p style={{ color:"#f87171", fontSize:"13px", paddingLeft:"34px" }}>{summaryError}</p>
            )}

            {/* Summary bullets — stream in */}
            {!summaryLoading && !summaryError && summaryItems.length > 0 && (
              <div style={{ paddingLeft:"34px", display:"flex", flexDirection:"column" }}>
                {summaryItems.slice(0, visCount).map((item, i) => (
                  <div key={i} className="ov-item" style={{
                    animationDelay:`${i*0.035}s`,
                    display:"flex", gap:"12px", padding:"12px 0",
                    borderBottom: i < visCount-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    alignItems:"flex-start",
                  }}>
                    <div style={{ width:"20px", height:"20px", borderRadius:"5px", background:"rgba(247,55,79,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"2px" }}>
                      <span style={{ fontSize:"9px", fontWeight:700, color:"#F7374F" }}>{i+1}</span>
                    </div>
                    <p style={{ fontSize:"clamp(13px,1.7vw,15px)", color:"rgba(255,255,255,0.8)", lineHeight:1.72, margin:0 }}>
                      {formatItem(item)}
                    </p>
                  </div>
                ))}
                {/* streaming cursor */}
                {visCount > 0 && visCount < summaryItems.length && (
                  <div style={{ width:"7px", height:"16px", borderRadius:"2px", background:"#F7374F", marginTop:"14px", animation:"ov-blink 0.7s ease-in-out infinite" }} />
                )}
              </div>
            )}

            {/* Regenerate */}
            {!summaryLoading && (
              <button className="ov-regen" onClick={() => {
                setSummaryError(""); setSummaryLoading(true); setSummaryItems([]); setVisCount(0);
                summaryAPI.create(doc._id, activeType)
                  .then(r => { const d = r.data.data; setSummaryItems(Array.isArray(d?.content) ? d.content : [d?.content]); })
                  .catch(e => setSummaryError(e?.message || "Failed"))
                  .finally(() => setSummaryLoading(false));
              }} style={{
                marginTop:"16px", marginLeft:"34px", padding:"7px 16px", borderRadius:"8px",
                border:"1px solid rgba(255,255,255,0.07)", background:"transparent",
                color:"rgba(255,255,255,0.25)", fontSize:"11px", cursor:"pointer", transition:"all 0.15s",
              }}>↺ Regenerate</button>
            )}
          </div>

          {/* ── CHAT HISTORY (past messages) ── */}
          {!histLoaded && (
            <div style={{ padding:"8px 0", display:"flex", alignItems:"center", gap:"8px", opacity:0.4 }}>
              <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"rgba(255,255,255,0.3)", animation:"ov-blink 1s ease-in-out infinite" }} />
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)" }}>Loading chat history…</span>
            </div>
          )}

          {histLoaded && messages.length === 0 && !chatLoading && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", padding:"16px 0 8px", opacity:0.35 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H8l-4 3V6a1 1 0 0 1 1-1z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3"/>
              </svg>
              <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", textAlign:"center" }}>
                Ask anything about this document to continue
              </p>
            </div>
          )}

          {/* messages */}
          {messages.map(m => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className="ov-item" style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom:"10px" }}>
                {!isUser && (
                  <div style={{ width:"26px", height:"26px", borderRadius:"7px", background:"rgba(247,55,79,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginRight:"8px", marginTop:"2px" }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M1.5 2.5h9M1.5 6h6.5M1.5 9.5h4" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
                <div style={{ maxWidth:"78%", display:"flex", flexDirection:"column", gap:"4px", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{
                    padding:"10px 15px",
                    borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    background: isUser ? "#F7374F" : "rgba(255,255,255,0.06)",
                    border: isUser ? "none" : "1px solid rgba(255,255,255,0.07)",
                    fontSize:"14px", color: isUser ? "#fff" : "rgba(255,255,255,0.82)", lineHeight:1.68,
                  }}>
                    {typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.join(" ") : String(m.content ?? "")}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ display:"flex", gap:"3px", flexWrap:"wrap" }}>
                      {m.sources.map((s:any, i:number) => (
                        <span key={i} title={s.chunkText} style={{ fontSize:"9px", padding:"2px 6px", borderRadius:"4px", background:"rgba(96,165,250,0.09)", color:"#60A5FA", cursor:"default" }}>
                          src·{Math.round(s.score*100)}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* typing indicator */}
          {chatLoading && (
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
              <div style={{ width:"26px", height:"26px", borderRadius:"7px", background:"rgba(247,55,79,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1.5 2.5h9M1.5 6h6.5M1.5 9.5h4" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </div>
              <div style={{ display:"flex", gap:"5px", padding:"11px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px 14px 14px 3px", alignItems:"center" }}>
                {[0,1,2].map(i => <div key={i} className="ov-dot" style={{ animationDelay:`${i*0.18}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── CHAT INPUT ── */}
      <div style={{
        flexShrink:0, borderTop:"1px solid rgba(255,255,255,0.06)", background:"#000",
        padding:"clamp(10px,2vh,14px) clamp(14px,4vw,44px)",
        paddingBottom:"max(clamp(10px,2vh,14px), env(safe-area-inset-bottom,0px))",
      }}>
        <div style={{ maxWidth:"720px", margin:"0 auto", display:"flex", gap:"8px", alignItems:"center" }}>
          <input
            ref={inputRef}
            className="ov-chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            placeholder="Ask anything about this document…"
            disabled={chatLoading}
            style={{ flex:1, padding:"11px 16px", borderRadius:"11px", border:"1px solid rgba(255,255,255,0.09)", background:"rgba(255,255,255,0.04)", color:"white", fontSize:"14px", transition:"border-color 0.15s" }}
          />
          <button
            className="ov-send"
            onClick={sendChat}
            disabled={!input.trim() || chatLoading}
            style={{ width:"42px", height:"42px", borderRadius:"11px", border:"none", background:"#F7374F", boxShadow:"0 0 16px rgba(247,55,79,0.3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}>
            {chatLoading ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation:"ov-blink 0.8s ease-in-out infinite" }}>
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M8 13V3M4 7l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DOCUMENT ROW
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
          gap:0 14px;
          align-items:center;
          padding:13px 4px;
          border-bottom:1px solid rgba(255,255,255,0.05);
          cursor:${isReady ? "pointer" : "default"};
          transition:background 0.15s;
          animation: row-in 0.35s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay:${index * 0.04}s;
        }
        @keyframes row-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .doc-row:last-child { border-bottom:none; }
        .doc-row:hover { background:${isReady ? "rgba(255,255,255,0.025)" : "transparent"}; }
        .doc-row-open { opacity:0; transition:opacity 0.15s; font-size:11px; font-weight:600; color:#F7374F; display:flex; align-items:center; gap:4px; }
        .doc-row:hover .doc-row-open { opacity:${isReady ? "1" : "0"}; }
      `}</style>

      <div className="doc-row" onClick={() => isReady && onOpen()}>
        <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:type.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke={type.color} strokeWidth="1.3"/>
            <path d="M10 1v4h4" stroke={type.color} strokeWidth="1.3"/>
          </svg>
        </div>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:"13px", fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:"2px" }}>{doc.title}</p>
          <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.22)" }}>
            {doc.wordCount > 0 ? `${formatWords(doc.wordCount)} words` : "Extracting…"}
            {doc.pageCount ? ` · ${doc.pageCount}p` : ""}
            {(doc.summaryCount ?? 0) > 0 ? ` · ${doc.summaryCount} summar${doc.summaryCount===1?"y":"ies"}` : ""}
          </p>
        </div>
        <span className="doc-type-badge" style={{ fontSize:"9px", fontWeight:700, padding:"2px 7px", borderRadius:"4px", background:type.bg, color:type.color, letterSpacing:"0.7px", flexShrink:0, display:"none" }}>
          {type.label}
        </span>
        <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.18)", flexShrink:0, whiteSpace:"nowrap" }}>
          {formatDate(doc.createdAt)}
        </span>
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", minWidth:"72px", justifyContent:"flex-end" }}>
          {isReady ? (
            <span className="doc-row-open">
              Open
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6M5.5 2.5l3 2.5-3 2.5" stroke="#F7374F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          ) : (
            <span style={{ fontSize:"10px", padding:"2px 7px", borderRadius:"20px", background:"rgba(251,191,36,0.08)", color:"#FBB724" }}>Processing</span>
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
        @keyframes lib-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .lib-up-1{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.04s both}
        .lib-up-2{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.12s both}
        .lib-up-3{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.20s both}

        .lib-search{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:8px 12px 8px 36px;font-size:13px;color:rgba(255,255,255,0.8);outline:none;transition:border-color 0.18s,background 0.18s;}
        .lib-search::placeholder{color:rgba(255,255,255,0.22);}
        .lib-search:focus{border-color:rgba(247,55,79,0.4);background:rgba(255,255,255,0.05);}

        .lib-chip{padding:5px 12px;border-radius:7px;border:none;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.12s,color 0.12s;}
        .lib-chip-off{background:transparent;color:rgba(255,255,255,0.28);}
        .lib-chip-off:hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);}
        .lib-chip-on{background:rgba(247,55,79,0.85);color:#fff;font-weight:600;}

        .lib-cta:hover{border-color:rgba(247,55,79,0.5)!important;background:linear-gradient(140deg,rgba(247,55,79,0.2) 0%,rgba(247,55,79,0.06) 100%)!important;transform:translateY(-2px);box-shadow:0 10px 36px rgba(247,55,79,0.12)!important;}
        .lib-cta:active{transform:scale(0.98)!important;}
        .lib-more:hover{background:rgba(255,255,255,0.06)!important;border-color:rgba(255,255,255,0.14)!important;color:rgba(255,255,255,0.75)!important;}

        @media(min-width:600px){ .doc-type-badge{display:inline!important;} }

        /* Mobile: hide date column, collapse grid */
        @media(max-width:540px){
          .doc-row{grid-template-columns:28px 1fr auto!important;gap:0 10px!important;}
          .doc-row>*:nth-child(4){display:none!important;}
          .lib-stat-grid{grid-template-columns:1fr 1fr!important;}
          .lib-stat-cta{grid-column:span 2!important;}
        }
      `}</style>

      <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"clamp(22px,4vw,40px) clamp(14px,3vw,26px) 60px" }}>

        {/* ── HEADER ── */}
        <div className="lib-up-1" style={{ marginBottom:"22px" }}>
          <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:"#F7374F", opacity:0.75, marginBottom:"6px" }}>
            Your Workspace
          </p>
          <h1 style={{ fontFamily:"'Josefin Sans','Arial Black',sans-serif", fontSize:"clamp(22px,3.5vw,38px)", fontWeight:700, color:"#fff", letterSpacing:"1px", lineHeight:1.05, textTransform:"uppercase", marginBottom:"5px" }}>
            Document Library
          </h1>
          <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.26)", lineHeight:1.6 }}>
            All your summaries and documents, organized in one place.
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="lib-up-2 lib-stat-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1.3fr", gap:"10px", marginBottom:"20px" }}>

          {/* Docs count */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"12px", padding:"clamp(12px,2vw,18px) clamp(12px,2vw,18px)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
              <span style={{ fontSize:"9px", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", color:"rgba(255,255,255,0.22)" }}>Docs</span>
              <div style={{ width:"24px", height:"24px", borderRadius:"6px", background:"rgba(247,55,79,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke="#F7374F" strokeWidth="1.3"/>
                  <path d="M10 1v4h4" stroke="#F7374F" strokeWidth="1.3"/>
                </svg>
              </div>
            </div>
            <div style={{ fontFamily:"'Josefin Sans','Arial Black',sans-serif", fontSize:"clamp(24px,3.5vw,36px)", fontWeight:700, color:"#fff", lineHeight:1 }}>
              {loading ? "—" : totalDocs}
            </div>
          </div>

          {/* Summaries count */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"12px", padding:"clamp(12px,2vw,18px) clamp(12px,2vw,18px)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
              <span style={{ fontSize:"9px", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", color:"rgba(255,255,255,0.22)" }}>Summaries</span>
              <div style={{ width:"24px", height:"24px", borderRadius:"6px", background:"rgba(167,139,250,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#A78BFA" strokeWidth="1.3"/>
                  <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div style={{ fontFamily:"'Josefin Sans','Arial Black',sans-serif", fontSize:"clamp(24px,3.5vw,36px)", fontWeight:700, color:"#fff", lineHeight:1 }}>
              {loading ? "—" : totalSummaries}
            </div>
          </div>

          {/* New Summary CTA */}
          <div className="lib-cta lib-stat-cta"
            onClick={() => router.push("/")}
            style={{ background:"linear-gradient(140deg,rgba(247,55,79,0.09) 0%,rgba(247,55,79,0.02) 100%)", border:"1px solid rgba(247,55,79,0.18)", borderRadius:"12px", padding:"clamp(12px,2vw,18px) clamp(12px,2vw,18px)", cursor:"pointer", transition:"all 0.2s", display:"flex", flexDirection:"column", justifyContent:"space-between", minHeight:"88px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#F7374F", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 14px rgba(247,55,79,0.38)", flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily:"'Josefin Sans','Arial Black',sans-serif", fontSize:"clamp(13px,1.8vw,16px)", fontWeight:700, color:"#fff", letterSpacing:"0.5px", textTransform:"uppercase", lineHeight:1.1 }}>New Summary</p>
                <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.28)", lineHeight:1.5, marginTop:"3px" }}>Upload · URL · Text</p>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"11px", fontWeight:700, color:"#F7374F", marginTop:"10px" }}>
              Start now
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6M5.5 2.5l3 2.5-3 2.5" stroke="#F7374F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── LIBRARY TABLE ── */}
        <div className="lib-up-3">

          {/* Toolbar */}
          <div style={{ marginBottom:"10px", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
            <div style={{ position:"relative", flex:"1", minWidth:"120px", maxWidth:"220px" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
                style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                <circle cx="5.5" cy="5.5" r="3.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.3"/>
                <path d="M9 9l2.5 2.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input className="lib-search" style={{ width:"100%" }} type="text" placeholder="Search…" value={search}
                onChange={e => { setSearch(e.target.value); setVisible(PAGE_SIZE); }} />
            </div>
            <div style={{ flex:1 }} />
            <div style={{ display:"flex", gap:"2px", background:"rgba(255,255,255,0.03)", borderRadius:"8px", padding:"2px" }}>
              {FILTERS.map(f => (
                <button key={f} className={`lib-chip ${filter===f ? "lib-chip-on" : "lib-chip-off"}`}
                  onClick={() => { setFilter(f); setVisible(PAGE_SIZE); }}>{f}</button>
              ))}
            </div>
          </div>

          {/* Table header */}
          <div style={{ padding:"7px 4px 5px", display:"grid", gridTemplateColumns:"32px 1fr auto auto auto", gap:"0 14px", alignItems:"center", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <div/>
            <span style={{ fontSize:"9px", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", color:"rgba(255,255,255,0.15)" }}>Document</span>
            <span style={{ fontSize:"9px", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", color:"rgba(255,255,255,0.15)" }}>Type</span>
            <span style={{ fontSize:"9px", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", color:"rgba(255,255,255,0.15)", whiteSpace:"nowrap" }}>Added</span>
            <div style={{ minWidth:"72px" }}/>
          </div>

          {/* Rows */}
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} style={{ padding:"14px 4px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", gap:"12px", alignItems:"center" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"rgba(255,255,255,0.05)" }} />
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"6px" }}>
                  <div style={{ height:"12px", borderRadius:"4px", background:"rgba(255,255,255,0.05)", width:`${50+i*12}%` }} />
                  <div style={{ height:"9px", borderRadius:"4px", background:"rgba(255,255,255,0.03)", width:"28%" }} />
                </div>
              </div>
            ))
          ) : shown.length > 0 ? (
            <>
              {shown.map((doc, i) => (
                <DocRow key={doc._id} doc={doc} index={i} onOpen={() => setActiveDoc(doc)} />
              ))}
              <div style={{ padding:"12px 4px", display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.16)" }}>
                  {shown.length} of {filtered.length} document{filtered.length!==1?"s":""}
                </span>
                {visible < filtered.length && (
                  <button className="lib-more" onClick={() => setVisible(v => v + PAGE_SIZE)}
                    style={{ padding:"6px 16px", borderRadius:"7px", border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"rgba(255,255,255,0.35)", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", gap:"5px", transition:"all 0.15s" }}>
                    View {Math.min(PAGE_SIZE, filtered.length - visible)} more
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1.5v7M2 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 24px", gap:"9px" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="rgba(255,255,255,0.05)" strokeWidth="1.4"/>
                <path d="M9 14h10M9 10h10M9 18h6" stroke="rgba(255,255,255,0.08)" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.16)", textAlign:"center" }}>No documents match your filter.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}