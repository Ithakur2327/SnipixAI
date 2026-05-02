"use client";
import { useState, useEffect } from "react";

const TABS = ["TL;DR", "Bullets", "Key Insights", "Action Points"];

interface Props {
  result: string[] | null;
  outputType: string;
  loading: boolean;
}

export default function ResultPanel({ result, outputType, loading }: Props) {
  const [activeTab, setActiveTab] = useState("Bullets");
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(0);

  // Progress bar animation when loading
  useEffect(() => {
    if (loading) {
      setProgress(0);
      setVisibleCount(0);
      const timer = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) { clearInterval(timer); return 90; }
          return p + 5;
        });
      }, 80);
      return () => clearInterval(timer);
    } else if (result) {
      setProgress(100);
      // Animate bullets one by one
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setVisibleCount(count);
        if (count >= result.length) clearInterval(interval);
      }, 300);
      return () => clearInterval(interval);
    }
  }, [loading, result]);

  // Empty state
  const isEmpty = !loading && !result;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "-0.2px",
          }}
        >
          Output
        </h3>

        {/* Status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            borderRadius: "20px",
            background: loading
              ? "rgba(251,191,36,0.12)"
              : result
              ? "rgba(52,211,153,0.12)"
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${
              loading
                ? "rgba(251,191,36,0.2)"
                : result
                ? "rgba(52,211,153,0.2)"
                : "rgba(255,255,255,0.08)"
            }`,
          }}
        >
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: loading ? "#FBB724" : result ? "#34D399" : "#555",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: loading ? "#FBB724" : result ? "#34D399" : "rgba(255,255,255,0.25)",
            }}
          >
            {loading ? "PROCESSING" : result ? "READY" : "WAITING"}
          </span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {loading && (
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
              Analyzing with RAG pipeline...
            </span>
            <span
              style={{ fontSize: "11px", color: "#E8590A", fontWeight: 600 }}
            >
              {progress}%
            </span>
          </div>
          <div
            style={{
              height: "3px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #E8590A, #FF7A2F)",
                borderRadius: "2px",
                transition: "width 0.15s ease",
              }}
            />
          </div>

          {/* Steps */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Extracting text", done: progress > 25 },
              { label: "Chunking",        done: progress > 50 },
              { label: "Embedding",       done: progress > 70 },
              { label: "Summarizing",     done: progress > 85 },
            ].map((step) => (
              <div
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  color: step.done
                    ? "#34D399"
                    : "rgba(255,255,255,0.2)",
                  transition: "color 0.3s",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  {step.done ? (
                    <path
                      d="M2 5l2.5 2.5L8 2"
                      stroke="#34D399"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <circle
                      cx="5"
                      cy="5"
                      r="3.5"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1"
                    />
                  )}
                </svg>
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Skeleton loading ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[85, 70, 90, 65, 75].map((w, i) => (
            <div
              key={i}
              style={{
                height: "12px",
                width: `${w}%`,
                borderRadius: "6px",
                background: "rgba(255,255,255,0.06)",
                animation: "shimmer 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            opacity: 0.4,
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M4 4h9l5 5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.4"
              />
              <path
                d="M13 4v5h5"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.4"
              />
              <path
                d="M7 12h8M7 15h5"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Upload a document or paste a URL
            <br />
            to see your summary here
          </p>
        </div>
      )}

      {/* ── Result ── */}
      {result && !loading && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* Output type tabs */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              marginBottom: "16px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "10px",
              padding: "3px",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: activeTab === tab ? 600 : 400,
                  background:
                    activeTab === tab
                      ? "rgba(232,89,10,0.2)"
                      : "transparent",
                  color:
                    activeTab === tab
                      ? "#E8590A"
                      : "rgba(255,255,255,0.3)",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Bullets */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0",
            }}
          >
            {result.slice(0, visibleCount).map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "10px 0",
                  borderBottom:
                    i < visibleCount - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  alignItems: "flex-start",
                  animation: "fadeUp 0.3s ease forwards",
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    background: "rgba(232,89,10,0.15)",
                    color: "#E8590A",
                    fontSize: "9px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.7,
                  }}
                >
                  {b}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "14px" }}>
              {[
                { label: "Model",  value: "GPT-4o" },
                { label: "Time",   value: "2.1s" },
                { label: "Tokens", value: "1,847" },
              ].map((s) => (
                <div key={s.label}>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.2)",
                    }}
                  >
                    {s.label}{" "}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: 600,
                    }}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                color: "#34D399",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5l2.5 2.5L8 2"
                  stroke="#34D399"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              RAG indexed
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}