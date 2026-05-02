"use client";
import { useState } from "react";
import { ChatMessage as ChatMsg } from "@/types";
import { MOCK_CHAT } from "@/lib/mockData";
import ChatMessage from "./ChatMessage";

export default function ChatInterface({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>(MOCK_CHAT);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = {
      _id:       Date.now().toString(),
      role:      "user",
      content:   input,
      sources:   [],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    // Phase 7: replace with real POST /rag/chat
    setTimeout(() => {
      setMessages((m) => [...m, {
        _id:       (Date.now() + 1).toString(),
        role:      "assistant",
        content:   "This is a mock response. Connect the RAG API in Phase 7 to get real answers with source citations.",
        sources:   [{ chunkId: "c1", chunkText: "Relevant passage...", score: 0.91 }],
        createdAt: new Date().toISOString(),
      }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border"
         style={{ background: "white", borderColor: "#E0E0E0" }}>

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "#F0F0F0" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
             style={{ background: "#E8590A" }}>
          AI
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>Document chat</p>
          <p className="text-xs" style={{ color: "#AAA" }}>42 chunks indexed · RAG enabled</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {messages.map((m) => <ChatMessage key={m._id} message={m} />)}

        {loading && (
          <div className="flex gap-1.5 items-center px-4 py-3 rounded-2xl w-fit"
               style={{ background: "#F5F5F5" }}>
            {[0, 150, 300].map((d) => (
              <div key={d} className="w-2 h-2 rounded-full animate-pulse-dot"
                   style={{ background: "#AAA", animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t flex gap-3 items-center" style={{ borderColor: "#F0F0F0" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything about this document..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none"
          style={{ borderColor: "#E0E0E0", background: "#FAFAFA" }}
          onFocus={(e) => (e.target.style.borderColor = "#E8590A")}
          onBlur={(e) => (e.target.style.borderColor = "#E0E0E0")}
        />
        <button onClick={send}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#E8590A" }}>
          Send
        </button>
      </div>
    </div>
  );
}