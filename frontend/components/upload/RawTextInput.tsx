"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function RawTextInput({ value, onChange }: Props) {
  return (
    <div style={{ borderRadius: "16px", padding: "24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <label style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
        Paste your text
      </label>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the content you want to summarize here..."
        rows={8}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: "10px", fontSize: "13px",
          border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
          color: "#fff", outline: "none", resize: "none", boxSizing: "border-box",
        }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(232,89,10,0.5)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
      />
      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "6px", textAlign: "right" }}>
        {value.split(/\s+/).filter(Boolean).length} words
      </p>
    </div>
  );
}