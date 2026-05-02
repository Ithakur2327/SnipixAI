"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOCK_DOCUMENTS } from "@/lib/mockData";
import DocumentCard from "@/components/dashboard/DocumentCard";

const STATS = [
  {
    label: "Total Documents",
    value: "12",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M4 2h7l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
          stroke="#E8590A"
          strokeWidth="1.4"
        />
        <path d="M11 2v4h4" stroke="#E8590A" strokeWidth="1.4" />
        <path
          d="M6 9h6M6 12h4"
          stroke="#E8590A"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
    change: "+3 this week",
    color: "#E8590A",
  },
  {
    label: "Summaries Generated",
    value: "28",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="#A78BFA" strokeWidth="1.4" />
        <path
          d="M6 9h6M6 6h6M6 12h4"
          stroke="#A78BFA"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
    change: "+8 this week",
    color: "#A78BFA",
  },
];

export default function DashboardPage() {
  const [filter, setFilter] = useState("All");
  const router = useRouter();
  const FILTERS = ["All", "PDF", "DOCX", "URL", "PPT"];

  const filtered =
    filter === "All"
      ? MOCK_DOCUMENTS
      : MOCK_DOCUMENTS.filter(
          (d) => d.sourceType.toLowerCase() === filter.toLowerCase()
        );

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px",
      }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-bebas), sans-serif",
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 400,
              color: "#FFFFFF",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            Your Document Library
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            Manage and explore your documents here.
          </p>
        </div>
      </div>

      {/* ── Stats + New Summary row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.2fr",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {/* Stat cards */}
        {STATS.map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 500,
                  fontFamily: "var(--font-inter), sans-serif",
                }}
              >
                {s.label}
              </span>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {s.icon}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-bebas), sans-serif",
                fontSize: "36px",
                color: "#FFFFFF",
                letterSpacing: "1px",
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#34D399",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              ↑ {s.change}
            </div>
          </div>
        ))}

        {/* New Summary CTA card */}
        <div
          onClick={() => router.push("/#summarizer")}
          style={{
            background:
              "linear-gradient(135deg, rgba(232,89,10,0.15), rgba(232,89,10,0.05))",
            border: "1px solid rgba(232,89,10,0.25)",
            borderRadius: "16px",
            padding: "20px",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(232,89,10,0.25), rgba(232,89,10,0.1))";
            e.currentTarget.style.borderColor = "rgba(232,89,10,0.5)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(232,89,10,0.15), rgba(232,89,10,0.05))";
            e.currentTarget.style.borderColor = "rgba(232,89,10,0.25)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "#E8590A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
              boxShadow: "0 0 20px rgba(232,89,10,0.4)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 4v12M4 10h12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p
              style={{
                fontFamily: "var(--font-bebas), sans-serif",
                fontSize: "22px",
                color: "#FFFFFF",
                letterSpacing: "0.5px",
                marginBottom: "4px",
              }}
            >
              New Summary
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-inter), sans-serif",
                lineHeight: 1.5,
              }}
            >
              Upload a doc, paste a URL, or drop an image to summarize
              instantly.
            </p>
          </div>
          <div
            style={{
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#E8590A",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            Start summarizing →
          </div>
        </div>
      </div>

      {/* ── Recent Documents ── */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        {/* Section header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-bebas), sans-serif",
              fontSize: "20px",
              fontWeight: 400,
              color: "#FFFFFF",
              letterSpacing: "0.5px",
            }}
          >
            Recent Documents
          </h3>

          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "10px",
              padding: "3px",
            }}
          >
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "7px",
                  border: "none",
                  background:
                    filter === f ? "rgba(232,89,10,0.9)" : "transparent",
                  color:
                    filter === f ? "white" : "rgba(255,255,255,0.35)",
                  fontSize: "11px",
                  fontWeight: filter === f ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "var(--font-inter), sans-serif",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Cards grid */}
        <div
          style={{
            padding: "20px 24px",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "14px",
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((doc) => (
              <DocumentCard key={doc._id} doc={doc} />
            ))
          ) : (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "48px",
                color: "rgba(255,255,255,0.2)",
                fontSize: "14px",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              No documents found for this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}