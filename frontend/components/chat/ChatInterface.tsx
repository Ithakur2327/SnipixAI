"use client";
import { useState, useEffect, useRef } from "react";
import { ragAPI } from "@/lib/api";

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  sources: { chunkId: string; chunkText: string; score: number }[];
  createdAt: string;
}

export default function ChatInterface({
  documentId,
  isReady = true,
}: {
  documentId: string;
  isReady?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!isReady) return;
    ragAPI.history(documentId)
      .then((res) => {
        const msgs = res.data.data?.messages || res.data.data || [];
        setMessages(msgs);
      })
      .catch(() => setMessages([]));
  }, [documentId, isReady]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading || !isReady) return;
    const question = input.trim();
    setInput("");

    const userMsg: Message = {
      _id: Date.now().toString(),
      role: "user",
      content: question,
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await ragAPI.chat(documentId, question);
      const { content, sources, messageId } = res.data.data;
      setMessages((m) => [...m, {
        _id: messageId || (Date.now() + 1).toString(),
        role: "assistant",
        content,
        sources: sources || [],
        createdAt: new Date().toISOString(),
      }]);
    } catch (err: any) {
      setMessages((m) => [...m, {
        _id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err?.message || "Something went wrong. Please try again.",
        sources: [],
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", borderRadius: "20px", overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>

      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#E8590A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "white" }}>
          AI
        </div>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>Document Chat</p>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
            {isReady ? "● RAG enabled · Ask anything" : "◌ Document processing..."}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {!isReady ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
              Chat will be available once your document is processed.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
              Ask anything about your document.<br />RAG will find the most relevant context.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m._id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: "4px", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isUser ? "#E8590A" : "rgba(255,255,255,0.06)",
                    border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
                    fontSize: "13px",
                    color: isUser ? "white" : "rgba(255,255,255,0.8)",
                    lineHeight: 1.6,
                  }}>
                    {m.content}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {m.sources.map((s, i) => (
                        <span key={i} title={s.chunkText} style={{
                          fontSize: "10px", padding: "2px 8px", borderRadius: "4px",
                          background: "rgba(96,165,250,0.12)", color: "#60A5FA", cursor: "pointer",
                        }}>
                          src · {Math.round(s.score * 100)}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div style={{ display: "flex", gap: "5px", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={isReady ? "Ask anything about this document..." : "Waiting for document..."}
          disabled={!isReady || loading}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)",
            color: "white", fontSize: "13px", outline: "none",
            opacity: (!isReady || loading) ? 0.5 : 1,
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(232,89,10,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
        />
        <button
          onClick={send}
          disabled={!isReady || loading || !input.trim()}
          style={{
            padding: "10px 18px", borderRadius: "10px", border: "none",
            background: "#E8590A", color: "white", fontSize: "13px", fontWeight: 600,
            cursor: (!isReady || loading || !input.trim()) ? "not-allowed" : "pointer",
            opacity: (!isReady || loading || !input.trim()) ? 0.5 : 1,
            boxShadow: "0 0 14px rgba(232,89,10,0.3)", transition: "opacity 0.15s",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}