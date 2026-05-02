"use client";
import { useState } from "react";
import { Document } from "@/types";
import { formatDate, formatWords } from "@/lib/utils";
import DocumentModal from "./DocumentModal";

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  pdf:      { label: "PDF", color: "#E8590A", bg: "rgba(232,89,10,0.12)" },
  docx:     { label: "DOC", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  ppt:      { label: "PPT", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  url:      { label: "URL", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  image:    { label: "IMG", color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  txt:      { label: "TXT", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  raw_text: { label: "TXT", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
};

export default function DocumentCard({ doc }: { doc: Document }) {
  const [open, setOpen] = useState(false);
  const isReady = doc.status === "ready";
  const type = TYPE_CONFIG[doc.sourceType] ?? TYPE_CONFIG["txt"];

  return (
    <>
      <div
        onClick={() => isReady && setOpen(true)}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px",
          padding: "18px",
          cursor: isReady ? "pointer" : "default",
          transition: "all 0.2s",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
        onMouseEnter={(e) => {
          if (!isReady) return;
          e.currentTarget.style.borderColor = "rgba(232,89,10,0.35)";
          e.currentTarget.style.background = "rgba(232,89,10,0.04)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: "5px",
              background: type.bg,
              color: type.color,
              letterSpacing: "0.8px",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            {type.label}
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "3px 9px",
              borderRadius: "20px",
              fontWeight: 500,
              background: isReady
                ? "rgba(52,211,153,0.1)"
                : "rgba(251,191,36,0.1)",
              color: isReady ? "#34D399" : "#FBB724",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            {isReady ? "● Ready" : "◌ Processing"}
          </span>
        </div>

        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: type.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 2h7l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
                stroke={type.color}
                strokeWidth="1.3"
              />
              <path d="M11 2v4h4" stroke={type.color} strokeWidth="1.3" />
              <path
                d="M6 9h6M6 12h4"
                stroke={type.color}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#FFFFFF",
                marginBottom: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              {doc.title}
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.28)",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              {doc.wordCount > 0
                ? `${formatWords(doc.wordCount)} words`
                : "Extracting..."}
              {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "10px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            {formatDate(doc.createdAt)}
          </span>
          {isReady && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#E8590A",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              Open →
            </span>
          )}
        </div>
      </div>

      {/* Full screen modal */}
      {open && (
        <DocumentModal doc={doc} onClose={() => setOpen(false)} />
      )}
    </>
  );
}