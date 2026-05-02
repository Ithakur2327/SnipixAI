"use client";
import { useState, useRef } from "react";
import UploadPanel from "./UploadPanel";
import ResultPanel from "./ResultPanel";

export default function HeroSection() {
  const [result, setResult] = useState<string[] | null>(null);
  const [outputType, setOutputType] = useState("bullets");
  const [loading, setLoading] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = (text: string, type: string) => {
    setOutputType(type);
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setLoading(false);
      setResult([
        "Revenue grew 23% YoY driven by enterprise segment expansion",
        "Customer churn decreased significantly from 8% down to 5.2%",
        "Three new product launches are scheduled for Q4 2024",
        "APAC region showed 41% growth, becoming second largest market",
        "Operating margin improved to 18.4% due to efficiency gains",
        "New partnerships signed with 3 Fortune 500 companies",
      ]);
    }, 2000);
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const move = (ev: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX =
        "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(75, Math.max(25, pct)));
    };

    const stop = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", stop);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", stop);
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        paddingTop: "0",
        display: "flex",
        flexDirection: "column",
        background: "rgba(15,15,20,0.7)",
      }}
    >
      <style>{`
        /* ── Keyframes ── */
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&display=swap');

        @keyframes snipix-fadein {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes snipix-fadein-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes snipix-badge-in {
          from { opacity: 0; transform: scale(0.88) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes snipix-dot-pulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 7px #E8590A; }
          50%       { opacity: 0.4; box-shadow: 0 0 2px #E8590A; }
        }
        @keyframes snipix-divider-grow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes snipix-panel-in {
          from { opacity: 0; transform: scale(0.975) translateY(14px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes snipix-underline-draw {
          from { stroke-dashoffset: 320; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes snipix-tooltip-pop {
          from { opacity: 0; transform: translateX(-50%) scale(0.85); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }

        /* ── Animation classes ── */
        .snipix-h1 {
          animation: snipix-fadein 0.65s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay: 0.05s;
        }
        .snipix-badge {
          animation: snipix-badge-in 0.55s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay: 0.22s;
        }
        .snipix-dot-live {
          animation: snipix-dot-pulse 2s ease-in-out infinite;
        }
        .snipix-divider {
          transform-origin: left center;
          animation: snipix-divider-grow 0.5s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay: 0.35s;
        }
        .snipix-sub {
          animation: snipix-fadein-up 0.6s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay: 0.42s;
        }
        .snipix-panel {
          animation: snipix-panel-in 0.7s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay: 0.28s;
        }
        .snipix-underline-svg path {
          stroke-dasharray: 320;
          animation: snipix-underline-draw 0.9s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay: 0.18s;
        }
        .snipix-tooltip-pop {
          animation: snipix-tooltip-pop 0.22s cubic-bezier(0.22,1,0.36,1) both;
        }
        .snipix-divider-bar {
          transition: background 0.22s ease;
        }
        .snipix-divider-bar:hover {
          background: rgba(232,89,10,0.5) !important;
        }

        @media (max-width: 768px) {
          h1 { white-space: normal !important; }
        }
      `}</style>

      {/* ══════════════════════════════
          HEADING BLOCK
      ══════════════════════════════ */}
      <div
        style={{
          textAlign: "center",
          padding: "clamp(10px, 1.5vw, 18px) 24px 20px",
        }}
      >
        {/* ── H1: made smaller via clamp ── */}
        <h1
          className="snipix-h1"
          style={{
            fontFamily: "'Josefin Sans', 'Arial Black', sans-serif",
            fontSize: "clamp(18px, 2vw, 28px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "0.5px",
            margin: "0 0 4px 0",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#FFFFFF" }}>Summarize </span>
          <span
            style={{
              color: "#E8590A",
              position: "relative",
              display: "inline-block",
            }}
          >
            anything
            {/* Curve underline — animated draw */}
            <svg
              viewBox="0 0 300 12"
              className="snipix-underline-svg"
              style={{
                position: "absolute",
                bottom: "-2px",
                left: 0,
                width: "100%",
                height: "7px",
              }}
              preserveAspectRatio="none"
            >
              <path
                d="M0 8 Q75 2 150 6 Q225 10 300 4"
                stroke="#E8590A"
                strokeWidth="2"
                fill="none"
                opacity="0.55"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.18)",
              WebkitTextStroke: "1px rgba(255,255,255,0.15)",
              WebkitTextFillColor: "transparent",
            }}
          >
            {" "}Instantly.
          </span>
        </h1>

        {/* ── Badge ── */}
        <div
          className="snipix-badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(232,89,10,0.08)",
            border: "1px solid rgba(232,89,10,0.22)",
            borderRadius: "100px",
            padding: "5px 14px",
            margin: "16px 0 14px",
          }}
        >
          <div
            className="snipix-dot-live"
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#E8590A",
              boxShadow: "0 0 7px #E8590A",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#E8590A",
              fontWeight: 600,
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            RAG-Powered AI Summarizer
          </span>
        </div>

        {/* ── Orange divider ── */}
        <div
          className="snipix-divider"
          style={{
            width: "32px",
            height: "2px",
            background: "#E8590A",
            margin: "0 auto 14px",
            borderRadius: "2px",
          }}
        />

        {/* ── Subheading ── */}
        <p
          className="snipix-sub"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "clamp(12px, 1.3vw, 14px)",
            color: "rgba(255,255,255,0.35)",
            maxWidth: "520px",
            margin: "0 auto",
            lineHeight: 1.85,
            fontWeight: 400,
          }}
        >
          Drop a{" "}
          <span
            style={{
              color: "rgba(255,255,255,0.65)",
              fontWeight: 500,
              background: "rgba(255,255,255,0.06)",
              padding: "1px 7px",
              borderRadius: "4px",
              fontSize: "11px",
              letterSpacing: "0.3px",
            }}
          >
            PDF · DOCX · URL · PPT · Image · Raw text
          </span>
          {" "}and get crisp summaries, key insights, and action points in seconds.
        </p>
      </div>

      {/* ══════════════════════════════
          SPLIT PANEL
      ══════════════════════════════ */}
      <div
        ref={containerRef}
        className="snipix-panel"
        style={{
          flex: 1,
          margin: "0 clamp(12px, 3vw, 32px) 24px",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexDirection: "row",
          minHeight: "clamp(400px, 52vh, 600px)",
          position: "relative",
          userSelect: isDragging ? "none" : "auto",
        }}
      >
        {/* LEFT — Upload Panel */}
        <div
          style={{
            width: `${splitPercent}%`,
            background: "#13131A",
            padding: "clamp(16px, 2.5vw, 28px)",
            overflow: "auto",
            overflowX: "hidden",
            flexShrink: 0,
            transition: isDragging ? "none" : "width 0.08s ease",
          }}
        >
          <UploadPanel onGenerate={handleGenerate} />
        </div>

        {/* ── Draggable Divider ── */}
        <div
          className="snipix-divider-bar"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{
            width: "5px",
            background: isDragging ? "#E8590A" : "rgba(255,255,255,0.06)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", pointerEvents: "none" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: "3px",
                  height: "3px",
                  borderRadius: "50%",
                  background: isDragging ? "white" : "rgba(255,255,255,0.25)",
                  transition: "background 0.2s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — Result Panel */}
        <div
          style={{
            flex: 1,
            background: "#0F0F14",
            padding: "clamp(16px, 2.5vw, 28px)",
            overflow: "auto",
            overflowX: "hidden",
            minWidth: 0,
            transition: isDragging ? "none" : "flex 0.08s ease",
          }}
        >
          <ResultPanel result={result} outputType={outputType} loading={loading} />
        </div>
      </div>

      {/* ── Drag % tooltip ── */}
      {isDragging && (
        <div
          className="snipix-tooltip-pop"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#E8590A",
            color: "white",
            padding: "6px 16px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 700,
            pointerEvents: "none",
            zIndex: 999,
            fontFamily: "var(--font-inter), sans-serif",
          }}
        >
          {Math.round(splitPercent)}% / {Math.round(100 - splitPercent)}%
        </div>
      )}

      {/* ══════════════════════════════
          SUPPORTED FORMATS BAR
      ══════════════════════════════ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          flexWrap: "wrap",
          padding: "0 24px clamp(24px, 4vw, 40px)",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "2px",
            fontWeight: 600,
            marginRight: "4px",
            textTransform: "uppercase",
            fontFamily: "var(--font-inter), sans-serif",
          }}
        >
        </span>
        {[].map((s) => (
          <span
            key={s}
            style={{
              fontSize: "10px",
              padding: "3px 9px",
              borderRadius: "5px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.25)",
              fontWeight: 500,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-inter), sans-serif",
              letterSpacing: "0.3px",
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}