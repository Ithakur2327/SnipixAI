"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { documentAPI, summaryAPI } from "@/lib/api";
import ChatInterface from "@/components/chat/ChatInterface";

const OUTPUT_TYPES = [
  { id: "tldr",            label: "TL;DR" },
  { id: "bullets",         label: "Bullets" },
  { id: "key_insights",    label: "Key Insights" },
  { id: "action_points",   label: "Action Points" },
  { id: "section_summary", label: "Section View" },
];

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pdf:      { label: "PDF",  color: "#F7374F", bg: "rgba(247,55,79,0.15)" },
  docx:     { label: "DOC",  color: "#60A5FA", bg: "rgba(96,165,250,0.15)" },
  ppt:      { label: "PPT",  color: "#A78BFA", bg: "rgba(167,139,250,0.15)" },
  url:      { label: "URL",  color: "#34D399", bg: "rgba(52,211,153,0.15)" },
  image:    { label: "IMG",  color: "#F472B6", bg: "rgba(244,114,182,0.15)" },
  txt:      { label: "TXT",  color: "#94A3B8", bg: "rgba(148,163,184,0.15)" },
  raw_text: { label: "TXT",  color: "#94A3B8", bg: "rgba(148,163,184,0.15)" },
};

export default function DocumentPage({ params }: { params: { id: string } }) {
  const searchParams   = useSearchParams();
  const defaultOutput  = (searchParams.get("outputType") || "bullets") as string;

  const [doc, setDoc]               = useState<any>(null);
  const [outputType, setOutputType] = useState(defaultOutput);
  const [summary, setSummary]       = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(true);
  const [polling, setPolling]       = useState(false);
  const [error, setError]           = useState("");

  const formatSummaryItem = (item: any) => {
    if (typeof item === "string") return item;
    if (item?.section && item?.summary) return `${item.section}: ${item.summary}`;
    if (item?.summary) return item.summary;
    return JSON.stringify(item);
  };

  // Load document
  useEffect(() => {
    documentAPI.get(params.id)
      .then((res) => setDoc(res.data.data.document))
      .catch(() => setError("Document not found"))
      .finally(() => setDocLoading(false));
  }, [params.id]);

  // Poll status until ready
  useEffect(() => {
    if (!doc || doc.status === "ready" || doc.status === "failed") return;
    setPolling(true);
    const interval = setInterval(() => {
      documentAPI.status(params.id).then((res) => {
        const { status } = res.data.data;
        if (status === "ready" || status === "failed") {
          setDoc((prev: any) => ({ ...prev, status }));
          setPolling(false);
          clearInterval(interval);
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [doc?.status, params.id]);

  // Generate summary when doc is ready or raw text is already extracted
  useEffect(() => {
    if (!doc || (!doc.rawText && doc.status !== "ready")) return;
    setSummaryLoading(true);
    setSummary(null);
    summaryAPI.create(params.id, outputType)
      .then((res) => setSummary(res.data.data))
      .catch((err) => setError(err?.message || "Failed to generate summary"))
      .finally(() => setSummaryLoading(false));
  }, [doc?.status, doc?.rawText, outputType, params.id]);

  const type = TYPE_CONFIG[doc?.sourceType] ?? TYPE_CONFIG["txt"];

  if (docLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>Loading document...</p>
    </div>
  );

  if (error && !doc) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <p style={{ color: "#f87171", fontSize: "14px" }}>{error}</p>
    </div>
  );

  const isProcessing = doc?.status !== "ready";

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

        {/* ── LEFT: Summary panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ borderRadius: "20px", padding: "24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>

            {/* Doc header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "5px", background: type.bg, color: type.color }}>
                    {type.label}
                  </span>
                  <span style={{
                    fontSize: "10px", padding: "2px 8px", borderRadius: "20px", fontWeight: 500,
                    background: doc?.status === "ready" ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)",
                    color: doc?.status === "ready" ? "#34D399" : "#FBB724",
                  }}>
                    {doc?.status === "ready" ? "● Ready" : polling ? "⟳ Processing..." : "◌ Pending"}
                  </span>
                </div>
                <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc?.title}
                </h2>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                  {doc?.wordCount > 0 ? `${doc.wordCount.toLocaleString()} words` : "Extracting..."}
                  {doc?.pageCount ? ` · ${doc.pageCount} pages` : ""}
                </p>
              </div>
            </div>

            {/* Processing state */}
            {isProcessing && (
              <div style={{ textAlign: "center", padding: "32px", borderRadius: "14px", background: "rgba(247,55,79,0.05)", border: "1px solid rgba(247,55,79,0.1)" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>⏳</div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>Processing your document...</p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>Extracting text, chunking, and embedding. This takes ~10-30 seconds.</p>
              </div>
            )}

            {/* Output type selector */}
            {!isProcessing && (
              <>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {OUTPUT_TYPES.map((o) => (
                    <button key={o.id} onClick={() => setOutputType(o.id)} style={{
                      padding: "5px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
                      border: outputType === o.id ? "1px solid rgba(247,55,79,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      background: outputType === o.id ? "rgba(247,55,79,0.15)" : "transparent",
                      color: outputType === o.id ? "#F7374F" : "rgba(255,255,255,0.35)",
                      fontWeight: outputType === o.id ? 600 : 400, transition: "all 0.15s",
                    }}>
                      {o.label}
                    </button>
                  ))}
                </div>

                {/* Summary content */}
                <div style={{ borderRadius: "14px", padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#F7374F", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {OUTPUT_TYPES.find((o) => o.id === outputType)?.label}
                    </span>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "5px" }}>
                      GPT-4o
                    </span>
                  </div>

                  {summaryLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {[1,2,3,4].map((i) => (
                        <div key={i} style={{ height: "14px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", width: `${70 + i * 7}%` }} />
                      ))}
                    </div>
                  ) : summary ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {(Array.isArray(summary.content) ? summary.content : [summary.content]).map((item: any, i: number) => (
                        <li key={i} style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: i < (Array.isArray(summary.content) ? summary.content.length : 1) - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems: "flex-start" }}>
                          <span style={{ width: "20px", height: "20px", borderRadius: "6px", background: "rgba(247,55,79,0.15)", color: "#F7374F", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: 1.7 }}>
                            {formatSummaryItem(item)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : error ? (
                    <p style={{ fontSize: "13px", color: "#f87171" }}>{error}</p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Chat ── */}
        <div style={{ height: "650px", position: "sticky", top: "80px" }}>
          <ChatInterface documentId={params.id} isReady={!isProcessing} />
        </div>
      </div>
    </div>
  );
}