"use client";
import { useState, useEffect, useRef } from "react";
import { ragAPI } from "@/lib/api";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { chunkId: string; chunkText: string; score: number }[];
}

interface Props {
  result: string[] | null;
  outputType: string;
  loading: boolean;
  documentId: string | null;
  onClose: () => void;
}

export default function ResultPanel({ result, outputType, loading, documentId, onClose }: Props) {
  const [mounted, setMounted]         = useState(false);
  const [closing, setClosing]         = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  // Chat state
  const [messages, setMessages]   = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Enter animation
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Hide navbar + prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Hide the navbar (it has z-index 999999 which would sit above overlay)
    const navbar = document.querySelector(".snx-nav") as HTMLElement | null;
    if (navbar) navbar.style.display = "none";
    return () => {
      document.body.style.overflow = "";
      if (navbar) navbar.style.display = "";
    };
  }, []);

  // Stream result items in
  useEffect(() => {
    if (!loading && result) {
      setVisibleCount(0);
      let c = 0;
      const iv = setInterval(() => {
        c++;
        setVisibleCount(c);
        if (c >= result.length) clearInterval(iv);
      }, 70);
      return () => clearInterval(iv);
    }
    if (loading) setVisibleCount(0);
  }, [loading, result]);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 280);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || !documentId) return;
    const q = chatInput.trim();
    setChatInput("");
    const userMsg: ChatMsg = { id: Date.now().toString(), role: "user", content: q };
    setMessages(m => [...m, userMsg]);
    setChatLoading(true);
    try {
      const res = await ragAPI.chat(documentId, q);
      const { content, sources, messageId } = res.data.data;
      setMessages(m => [...m, {
        id: messageId || (Date.now() + 1).toString(),
        role: "assistant",
        content,
        sources: sources || [],
      }]);
    } catch (err: any) {
      setMessages(m => [...m, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err?.message || "Something went wrong.",
        sources: [],
      }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const outputLabel =
    outputType === "bullets"         ? "Key Points"      :
    outputType === "tldr"            ? "TL;DR"           :
    outputType === "key_insights"    ? "Key Insights"    :
    outputType === "action_points"   ? "Action Points"   :
    outputType === "section_summary" ? "Section Summary" : "Summary";

  const isOpen = mounted && !closing;
  const hasSummary = result && result.length > 0;
  const summaryDone = hasSummary && visibleCount >= result!.length;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000000,
      background: "#000",
      display: "flex", flexDirection: "column",
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? "translateY(0)" : "translateY(18px)",
      transition: "opacity 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)",
    }}>

      <style>{`
        @keyframes rp-in    { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes rp-blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes rp-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        @keyframes rp-dots {
          0%,80%,100% { transform: scale(0.7); opacity:0.4; }
          40%          { transform: scale(1);   opacity:1;   }
        }
        .rp-item { animation: rp-in 0.22s cubic-bezier(0.22,1,0.36,1) both; }
        .rp-skel {
          border-radius: 8px;
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.09) 50%,
            rgba(255,255,255,0.04) 75%);
          background-size: 600px 100%;
          animation: rp-shimmer 1.5s ease-in-out infinite;
        }
        .rp-dot {
          width:7px; height:7px; border-radius:50%;
          background: rgba(255,255,255,0.35);
          animation: rp-dots 1.4s ease-in-out infinite;
        }
        .rp-chat-input:focus { border-color: rgba(247,55,79,0.45) !important; outline:none; }
        .rp-send-btn:disabled { opacity:0.35; cursor:not-allowed; }
        .rp-send-btn:not(:disabled):hover { background:#ff4f65 !important; box-shadow: 0 0 20px rgba(247,55,79,0.5) !important; }
        .rp-close:hover { background:rgba(247,55,79,0.1) !important; border-color:rgba(247,55,79,0.35) !important; color:#F7374F !important; }

        /* Scrollbar */
        .rp-scroll::-webkit-scrollbar { width:4px; }
        .rp-scroll::-webkit-scrollbar-track { background: transparent; }
        .rp-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius:4px; }
      `}</style>

      {/* ── TOP BAR ───────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(16px,4vw,48px)",
        height: "58px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Left: brand + status */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "9px",
            background: "rgba(247,55,79,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 3h11M2 7.5h8M2 12h5" stroke="#F7374F" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.3px" }}>
            SnipixAI
          </span>

          {/* Status pill */}
          {loading && (
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "3px 10px", borderRadius: "20px",
              background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
            }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#FBB724", animation:"rp-blink 1s ease-in-out infinite" }} />
              <span style={{ fontSize:"10px", fontWeight:600, color:"#FBB724" }}>Generating…</span>
            </div>
          )}
          {!loading && hasSummary && summaryDone && (
            <div style={{
              display:"flex", alignItems:"center", gap:"5px",
              padding:"3px 10px", borderRadius:"20px",
              background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.2)",
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2 2L7.5 2" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize:"10px", fontWeight:600, color:"#34D399" }}>Ready</span>
            </div>
          )}
        </div>

        {/* Close */}
        <button
          className="rp-close"
          onClick={handleClose}
          title="Close & reset"
          style={{
            width:"36px", height:"36px", borderRadius:"10px",
            border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.04)",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(255,255,255,0.45)", transition:"all 0.15s",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── SCROLLABLE BODY ───────────────────────── */}
      <div
        className="rp-scroll"
        style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}
      >
        <div style={{
          maxWidth: "760px", width: "100%",
          margin: "0 auto",
          padding: "clamp(24px,5vh,52px) clamp(16px,4vw,40px) 24px",
          display: "flex", flexDirection: "column", gap: "0",
          flex: 1,
        }}>

          {/* ── SUMMARY SECTION ───────────────────── */}
          <div style={{ marginBottom: "40px" }}>

            {/* Label */}
            <p style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
              marginBottom: "20px",
            }}>
              {outputLabel}
            </p>

            {/* Loading skeletons */}
            {loading && (
              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                {[88, 72, 80, 60, 85, 68, 76, 55, 82, 70].map((w, i) => (
                  <div key={i} className="rp-skel"
                    style={{ height:"17px", width:`${w}%`, animationDelay:`${i*0.07}s` }}
                  />
                ))}
              </div>
            )}

            {/* Result items */}
            {!loading && hasSummary && (
              <div style={{ display:"flex", flexDirection:"column" }}>
                {result!.slice(0, visibleCount).map((item, i) => (
                  <div
                    key={i}
                    className="rp-item"
                    style={{
                      animationDelay: `${i * 0.035}s`,
                      display:"flex", gap:"14px",
                      padding:"14px 0",
                      borderBottom: i < visibleCount - 1
                        ? "1px solid rgba(255,255,255,0.05)" : "none",
                      alignItems:"flex-start",
                    }}
                  >
                    <div style={{
                      width:"22px", height:"22px", borderRadius:"6px",
                      background:"rgba(247,55,79,0.12)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, marginTop:"3px",
                    }}>
                      <span style={{ fontSize:"9px", fontWeight:700, color:"#F7374F" }}>{i+1}</span>
                    </div>
                    <p style={{
                      fontSize:"clamp(14px,1.8vw,16px)",
                      color:"rgba(255,255,255,0.82)",
                      lineHeight:1.75, margin:0,
                    }}>
                      {item}
                    </p>
                  </div>
                ))}

                {/* Streaming cursor */}
                {visibleCount > 0 && visibleCount < result!.length && (
                  <div style={{
                    width:"7px", height:"17px", borderRadius:"2px",
                    background:"#F7374F", marginTop:"16px",
                    animation:"rp-blink 0.7s ease-in-out infinite",
                  }} />
                )}
              </div>
            )}
          </div>

          {/* ── DIVIDER before chat ─────────────────── */}
          {(summaryDone || (!loading && !hasSummary)) && (
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              marginBottom: "32px",
            }} />
          )}

          {/* ── CHAT MESSAGES ─────────────────────── */}
          {(summaryDone || (!loading && !hasSummary)) && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"16px", paddingBottom:"8px" }}>

              {/* Empty chat hint */}
              {messages.length === 0 && (
                <div style={{
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:"10px", padding:"20px 0 8px",
                  opacity:0.4,
                }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M4 6h20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 3V7a1 1 0 0 1 1-1z"
                      stroke="rgba(255,255,255,0.5)" strokeWidth="1.4"/>
                  </svg>
                  <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)", textAlign:"center", lineHeight:1.6 }}>
                    Ask anything about this document
                  </p>
                </div>
              )}

              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id}
                    className="rp-item"
                    style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start" }}
                  >
                    {/* AI avatar */}
                    {!isUser && (
                      <div style={{
                        width:"28px", height:"28px", borderRadius:"8px",
                        background:"rgba(247,55,79,0.15)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        flexShrink:0, marginRight:"10px", marginTop:"2px",
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1.5 2.5h9M1.5 6h6.5M1.5 9.5h4" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}

                    <div style={{
                      maxWidth:"78%", display:"flex", flexDirection:"column",
                      gap:"6px", alignItems: isUser ? "flex-end" : "flex-start",
                    }}>
                      <div style={{
                        padding:"11px 16px",
                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: isUser ? "#F7374F" : "rgba(255,255,255,0.06)",
                        border: isUser ? "none" : "1px solid rgba(255,255,255,0.07)",
                        fontSize:"14px", color: isUser ? "#fff" : "rgba(255,255,255,0.82)",
                        lineHeight:1.65,
                      }}>
                        {m.content}
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                          {m.sources.map((s, i) => (
                            <span key={i} title={s.chunkText} style={{
                              fontSize:"10px", padding:"2px 8px", borderRadius:"5px",
                              background:"rgba(96,165,250,0.1)", color:"#93C5FD",
                              border:"1px solid rgba(96,165,250,0.15)", cursor:"default",
                            }}>
                              src · {Math.round(s.score * 100)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* AI typing indicator */}
              {chatLoading && (
                <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{
                    width:"28px", height:"28px", borderRadius:"8px",
                    background:"rgba(247,55,79,0.15)",
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1.5 2.5h9M1.5 6h6.5M1.5 9.5h4" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{
                    display:"flex", gap:"5px", padding:"12px 16px",
                    background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"16px 16px 16px 4px", alignItems:"center",
                  }}>
                    {[0,1,2].map(i => (
                      <div key={i} className="rp-dot" style={{ animationDelay:`${i*0.18}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT INPUT BAR (fixed at bottom) ──────── */}
      {(summaryDone || (!loading && !hasSummary)) && (
        <div style={{
          flexShrink:0,
          borderTop:"1px solid rgba(255,255,255,0.06)",
          background:"#000",
          padding:"clamp(10px,2vh,16px) clamp(16px,4vw,48px)",
          paddingBottom: "max(clamp(10px,2vh,16px), env(safe-area-inset-bottom, 0px))",
        }}>
          <div style={{
            maxWidth:"760px", margin:"0 auto",
            display:"flex", gap:"10px", alignItems:"center",
          }}>
            <input
              ref={inputRef}
              className="rp-chat-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder={documentId ? "Ask anything about this document…" : "Summary ready — no document to chat with"}
              disabled={chatLoading || !documentId}
              style={{
                flex:1, padding:"12px 18px",
                borderRadius:"12px",
                border:"1px solid rgba(255,255,255,0.09)",
                background:"rgba(255,255,255,0.04)",
                color:"white", fontSize:"14px",
                transition:"border-color 0.15s",
                opacity: (!documentId || chatLoading) ? 0.5 : 1,
              }}
            />
            <button
              className="rp-send-btn"
              onClick={sendChat}
              disabled={!chatInput.trim() || chatLoading || !documentId}
              style={{
                width:"44px", height:"44px", borderRadius:"12px", border:"none",
                background:"#F7374F",
                boxShadow:"0 0 18px rgba(247,55,79,0.35)",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.15s", flexShrink:0,
              }}
            >
              {chatLoading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  style={{ animation:"rp-blink 0.8s ease-in-out infinite" }}>
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
      )}
    </div>
  );
}
