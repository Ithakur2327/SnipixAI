"use client";
import { useState } from "react";

export default function UrlInput() {
  const [url, setUrl] = useState("");

  return (
    <div className="rounded-2xl p-6 border" style={{ background: "#FAFAFA", borderColor: "#E0E0E0" }}>
      <label className="text-xs font-bold block mb-2 uppercase tracking-wider" style={{ color: "#888" }}>
        Web URL
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/article"
        className="w-full px-4 py-3 rounded-lg text-sm border outline-none"
        style={{ borderColor: "#D0D0D0", background: "white" }}
        onFocus={(e) => (e.target.style.borderColor = "#E8590A")}
        onBlur={(e) => (e.target.style.borderColor = "#D0D0D0")}
      />
      <p className="text-xs mt-2" style={{ color: "#AAA" }}>
        We'll use Puppeteer to extract the page content automatically.
      </p>
    </div>
  );
}