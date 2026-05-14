"use client";
import { useState, useEffect, useRef } from "react";
import { Document, ChatMessage } from "@/types";
import { summaryAPI, ragAPI } from "@/lib/api";

const OUTPUT_TYPES = [
  { id: "tldr",            label: "TL;DR" },
  { id: "bullets",         label: "Bullets" },
  { id: "key_insights",    label: "Key Insights" },
  { id: "action_points",   label: "Action Points" },
  { id: "section_summary", label: "Section View" },
];

export default function DocumentModal({
  doc,
  onClose,
}: {
  doc: Document;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab]   = useState<"summary" | "chat">("summary");
  const [activeType, setActiveType] = useState("bullets");
  const [summary, setSummary]       = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError]     = useState("");
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading]       = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput]           = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load summary whenever outputType changes
  useEffect(() => {
    setSummaryError("");
    setSummaryLoading(true);
    setSummary(null);
    summaryAPI.create(doc._id, activeType)
      .then((res) => setSummary(res.data.data))
      .catch((err) => setSummaryError(err?.message || "Failed to generate summary"))
      .finally(() => setSummaryLoading(false));
  }, [activeType, doc._id]);

  // Load chat history when chat tab opens
  useEffect(() => {
    if (activeTab !== "chat") return;
    setHistoryLoading(true);
    ragAPI.history(doc._id)
      .then((res) => {
        const msgs = res.data.data?.messages ?? res.data.data ?? [];
        setMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoading(false));
  }, [activeTab, doc._id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const formatSummaryItem = (item: any) => {
    if (typeof item === "string") return item;
    if (item?.section && item?.summary) return `${item.section}: ${item.summary}`;
    if (item?.summary) return item.summary;
    return JSON.stringify(item);
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const text = input.trim();
    setInput("");

    const userMsg: ChatMessage = {
      _id: Date.now().toString(),
      role: "user",
      content: text,
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setChatLoading(true);

    try {
      const res = await ragAPI.chat(doc._id, text);
      const { answer, sources } = res.data.data;
      setMessages((m) => [
        ...m,
        {
          _id: (Date.now() + 1).toString(),
          role: "assistant",
          content: answer,
          sources: sources ?? [],
          createdAt: new Date().toISOString(),
        },
      ]);
      // Update chunk count from first response
      if (chunkCount === null && sources?.length) {
        setChunkCount(sources.length);
      }
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        {
          _id: (Date.now() + 1).toString(),
          role: "assistant",
          content: err?.message || "Something went wrong. Please try again.",
          sources: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const summaryItems = summary
    ? Array.isArray(summary.content)
      ? summary.content
      : [summary.content]
    : [];

  if (isMinimized) {
    return (
      <div
        style={{
          position: "fixed", bottom: "24px", right: "24px",
          background: "#1A1A24", border: "1px solid rgba(247,55,79,0.4)",
          borderRadius: "14px", padding: "12px 18px",
          display: "flex", alignItems: "center", gap: "12px",
          zIndex: 1000, cursor: "pointer",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        onClick={() => setIsMinimized(false)}
      >
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F7374F", boxShadow: "0 0 8px #F7374F" }} />
        <span style={{ fontSize: "13px", fontWeight: 600, color: "white", fontFamily: "var(--font-inter), sans-serif", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {doc.title}
        </span>
        <span style={{ fontSize: "11px", color: "#F7374F" }}>Expand ↗</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: "1100px", height: "90vh",
        background: "#000000", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px", display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(247,55,79,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke="#F7374F" strokeWidth="1.2"/>
                <path d="M10 1v4h4" stroke="#F7374F" strokeWidth="1.2"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-inter), sans-serif" }}>{doc.title}</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-inter), sans-serif" }}>
                {doc.sourceType.toUpperCase()} · {doc.wordCount > 0 ? `${doc.wordCount.toLocaleString()} words` : "Processing"}
                {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => setIsMinimized(true)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }} title="Minimize">─</button>
            <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }} title="Close">×</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "6px" }}>
          {(["summary", "chat"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "7px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
              fontSize: "13px", fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? "rgba(247,55,79,0.15)" : "transparent",
              color: activeTab === tab ? "#F7374F" : "rgba(255,255,255,0.35)",
              transition: "all 0.15s", fontFamily: "var(--font-inter), sans-serif",
            }}>
              {tab === "summary" ? "📄 Summary" : "💬 Chat with Doc"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

          {/* SUMMARY TAB */}
          {activeTab === "summary" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {/* Output type selector */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
                {OUTPUT_TYPES.map((o) => (
                  <button key={o.id} onClick={() => setActiveType(o.id)} style={{
                    padding: "6px 16px", borderRadius: "20px",
                    border: activeType === o.id ? "1px solid rgba(247,55,79,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    background: activeType === o.id ? "rgba(247,55,79,0.15)" : "transparent",
                    color: activeType === o.id ? "#F7374F" : "rgba(255,255,255,0.35)",
                    fontSize: "12px", fontWeight: activeType === o.id ? 600 : 400,
                    cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "var(--font-inter), sans-serif",
                  }}>
                    {o.label}
                  </button>
                ))}
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px", maxWidth: "800px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#F7374F", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font-inter), sans-serif" }}>
                    {OUTPUT_TYPES.find((o) => o.id === activeType)?.label}
                  </span>
                  {summary && (
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: "6px", fontFamily: "var(--font-inter), sans-serif" }}>
                      {summary.modelName ?? "GPT-4o"} · {summary.processingTimeMs ? `${(summary.processingTimeMs / 1000).toFixed(1)}s` : ""}
                    </span>
                  )}
                </div>

                {/* Loading skeleton */}
                {summaryLoading && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ height: "16px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", width: `${65 + i * 8}%` }} />
                    ))}
                  </div>
                )}

                {/* Error */}
                {summaryError && !summaryLoading && (
                  <p style={{ fontSize: "13px", color: "#f87171", fontFamily: "var(--font-inter), sans-serif" }}>{summaryError}</p>
                )}

                {/* Bullets */}
                {!summaryLoading && !summaryError && summaryItems.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {summaryItems.map((item: any, i: number) => (
                      <li key={i} style={{ display: "flex", gap: "14px", padding: "12px 0", borderBottom: i < summaryItems.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "flex-start" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(247,55,79,0.12)", color: "#F7374F", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", fontFamily: "var(--font-inter), sans-serif" }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", lineHeight: 1.75, fontFamily: "var(--font-inter), sans-serif" }}>{formatSummaryItem(item)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Regenerate — clears cached summary and refetches */}
              <button
                onClick={() => {
                  setSummary(null);
                  setSummaryError("");
                  setSummaryLoading(true);
                  summaryAPI.create(doc._id, activeType)
                    .then((res) => setSummary(res.data.data))
                    .catch((err) => setSummaryError(err?.message || "Failed"))
                    .finally(() => setSummaryLoading(false));
                }}
                disabled={summaryLoading}
                style={{
                  marginTop: "16px", padding: "10px 24px", borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)", background: "transparent",
                  color: summaryLoading ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.35)",
                  fontSize: "13px", cursor: summaryLoading ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-inter), sans-serif", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (!summaryLoading) { e.currentTarget.style.borderColor = "rgba(247,55,79,0.4)"; e.currentTarget.style.color = "#F7374F"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
              >
                ↺ Regenerate summary
              </button>
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* RAG status bar */}
              <div style={{ padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34D399", boxShadow: "0 0 6px #34D399" }} />
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-inter), sans-serif" }}>
                  RAG enabled{chunkCount ? ` · ${chunkCount} sources` : ""}
                </span>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {historyLoading && (
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", textAlign: "center", fontFamily: "var(--font-inter), sans-serif" }}>Loading history...</p>
                )}
                {!historyLoading && messages.length === 0 && (
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: "40px", fontFamily: "var(--font-inter), sans-serif" }}>
                    Ask anything about this document
                  </p>
                )}
                {messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={m._id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", gap: "6px", alignItems: isUser ? "flex-end" : "flex-start" }}>
                        <div style={{
                          padding: "12px 16px",
                          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          background: isUser ? "#F7374F" : "rgba(255,255,255,0.05)",
                          border: isUser ? "none" : "1px solid rgba(255,255,255,0.07)",
                          fontSize: "14px", color: isUser ? "white" : "rgba(255,255,255,0.8)",
                          lineHeight: 1.65, fontFamily: "var(--font-inter), sans-serif",
                        }}>
                          {m.content}
                        </div>
                        {m.sources && m.sources.length > 0 && (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {m.sources.map((s, i) => (
                              <span key={i} title={s.chunkText} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(96,165,250,0.1)", color: "#60A5FA", cursor: "pointer", fontFamily: "monospace" }}>
                                src · {(s.score * 100).toFixed(0)}%
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {chatLoading && (
                  <div style={{ display: "flex", gap: "5px", padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px 16px 16px 4px", width: "fit-content" }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask anything about this document..."
                  style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: "14px", outline: "none", fontFamily: "var(--font-inter), sans-serif" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !input.trim()}
                  style={{ padding: "12px 22px", borderRadius: "12px", border: "none", background: chatLoading || !input.trim() ? "rgba(247,55,79,0.4)" : "#F7374F", color: "white", fontSize: "14px", fontWeight: 600, cursor: chatLoading || !input.trim() ? "not-allowed" : "pointer", boxShadow: "0 0 16px rgba(247,55,79,0.3)", fontFamily: "var(--font-inter), sans-serif" }}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}