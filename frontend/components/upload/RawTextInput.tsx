"use client";
import { useState } from "react";

export default function RawTextInput() {
  const [text, setText] = useState("");

  return (
    <div className="rounded-2xl p-6 border" style={{ background: "#FAFAFA", borderColor: "#E0E0E0" }}>
      <label className="text-xs font-bold block mb-2 uppercase tracking-wider" style={{ color: "#888" }}>
        Paste your text
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the content you want to summarize here..."
        rows={8}
        className="w-full px-4 py-3 rounded-lg text-sm border outline-none resize-none"
        style={{ borderColor: "#D0D0D0", background: "white" }}
        onFocus={(e) => (e.target.style.borderColor = "#E8590A")}
        onBlur={(e) => (e.target.style.borderColor = "#D0D0D0")}
      />
      <p className="text-xs mt-1 text-right" style={{ color: "#AAA" }}>
        {text.split(/\s+/).filter(Boolean).length} words
      </p>
    </div>
  );
}