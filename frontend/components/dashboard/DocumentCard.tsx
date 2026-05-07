"use client";
import { useState } from "react";
import { Document } from "@/types";
import { formatDate, formatWords } from "@/lib/utils";
import DocumentModal from "./DocumentModal";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pdf:      { label: "PDF",  color: "#E8590A", bg: "rgba(232,89,10,0.12)"   },
  docx:     { label: "DOC",  color: "#60A5FA", bg: "rgba(96,165,250,0.12)"  },
  ppt:      { label: "PPT",  color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  url:      { label: "URL",  color: "#34D399", bg: "rgba(52,211,153,0.12)"  },
  image:    { label: "IMG",  color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  txt:      { label: "TXT",  color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  raw_text: { label: "TXT",  color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
};

export default function DocumentCard({ doc }: { doc: Document }) {
  const [open, setOpen] = useState(false);
  const isReady = doc.status === "ready";
  const type    = TYPE_CONFIG[doc.sourceType] ?? TYPE_CONFIG["txt"];

  return (
    <>
      <style>{`
        .doc-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 0;
          cursor: ${isReady ? "pointer" : "default"};
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .doc-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .doc-card:hover::before { opacity: 1; }
        .doc-card.ready:hover {
          border-color: rgba(232,89,10,0.28);
          background: rgba(232,89,10,0.03);
          transform: translateY(-3px);
          box-shadow: 0 10px 32px rgba(0,0,0,0.25);
        }
        .doc-open-btn {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 600; color: #E8590A;
          font-family: var(--font-inter), sans-serif;
          opacity: 0; transform: translateX(-4px);
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .doc-card.ready:hover .doc-open-btn {
          opacity: 1; transform: translateX(0);
        }
      `}</style>

      <div
        className={`doc-card${isReady ? " ready" : ""}`}
        onClick={() => isReady && setOpen(true)}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <span style={{
            fontSize: "9.5px", fontWeight: 700,
            padding: "3px 9px", borderRadius: "5px",
            background: type.bg, color: type.color,
            letterSpacing: "1px",
            fontFamily: "var(--font-inter), sans-serif",
          }}>
            {type.label}
          </span>
          <span style={{
            fontSize: "10px", fontWeight: 500,
            padding: "3px 9px", borderRadius: "20px",
            background: isReady ? "rgba(52,211,153,0.09)" : "rgba(251,191,36,0.09)",
            color: isReady ? "#34D399" : "#FBB724",
            fontFamily: "var(--font-inter), sans-serif",
          }}>
            {isReady ? "● Ready" : "◌ Processing"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "10px",
            background: type.bg, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M5 3h8l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
                stroke={type.color} strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M13 3v4h4" stroke={type.color} strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M7 10h6M7 13h4" stroke={type.color} strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: "13px", fontWeight: 600, color: "#FFFFFF",
              marginBottom: "4px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "var(--font-inter), sans-serif",
              lineHeight: 1.3,
            }}>
              {doc.title}
            </p>
            <p style={{
              fontSize: "11px", color: "rgba(255,255,255,0.26)",
              fontFamily: "var(--font-inter), sans-serif",
            }}>
              {doc.wordCount > 0 ? `${formatWords(doc.wordCount)} words` : "Extracting…"}
              {doc.pageCount ? ` · ${doc.pageCount}p` : ""}
              {(doc.summaryCount ?? 0) > 0 ? ` · ${doc.summaryCount} summar${doc.summaryCount === 1 ? "y" : "ies"}` : ""}
            </p>
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "12px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <span style={{
            fontSize: "10px", color: "rgba(255,255,255,0.18)",
            fontFamily: "var(--font-inter), sans-serif",
          }}>
            {formatDate(doc.createdAt)}
          </span>
          {isReady && (
            <span className="doc-open-btn">
              Open
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="#E8590A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
        </div>
      </div>

      {open && <DocumentModal doc={doc} onClose={() => setOpen(false)} />}
    </>
  );
}