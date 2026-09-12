"use client";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#0A0A0F",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "clamp(18px,4vw,28px) clamp(16px,4vw,32px)",
        animation: "snxFadeUp 0.64s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both",
      }}
    >
      <style>{`
        @keyframes snxFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
          Snipix<span style={{ color: "#E8590A" }}>AI</span>
        </span>

        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>
          © 2025 SnipixAI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}