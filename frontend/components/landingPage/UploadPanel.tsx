"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useAppStore } from "@/store/useAppStore";
import api from "@/lib/api";

const OUTPUT_TYPES = [
  { id: "bullets",         label: "Bullets" },
  { id: "tldr",            label: "TL;DR" },
  { id: "key_insights",    label: "Key Insights" },
  { id: "action_points",   label: "Action Points" },
  { id: "section_summary", label: "Section View" },
];

const INPUT_TABS = ["File", "URL", "Text"];

// ✅ FIX: onGenerate ab sirf Text/URL ke liye hai
// File ka flow alag hai — FormData se upload hoga
interface Props {
  onGenerate: (content: string, type: string, inputMode: "text" | "url" | "file", file?: File) => void;
}

export default function UploadPanel({ onGenerate }: Props) {
  const [activeInput, setActiveInput] = useState("Text"); // ✅ Default: Text (landing page ke liye best)
  const [outputType, setOutputType]   = useState("bullets");
  const [url, setUrl]                 = useState("");
  const [text, setText]               = useState("");
  const [file, setFile]               = useState<File | null>(null);
  const { isAuthenticated }           = useAppStore();

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const mapMimeToSourceType = (mime: string) => {
    switch (mime) {
      case "application/pdf": return "pdf";
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": return "docx";
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation": return "ppt";
      case "text/plain": return "txt";
      case "image/png":
      case "image/jpeg": return "image";
      default: return "pdf";
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 25 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "text/plain": [".txt"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  });

  const handleSubmit = () => {
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return;
  }

  if (activeInput === "URL") {
    if (!url.trim()) return;
    onGenerate(url.trim(), outputType, "url");
  } else if (activeInput === "Text") {
    if (!text.trim() || text.trim().split(/\s+/).length < 5) return;
    onGenerate(text.trim(), outputType, "text");
  } else if (activeInput === "File") {
    if (!file) return;
    onGenerate("", outputType, "file", file);
  }
};
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <div>
        <h3 style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: "4px" }}>
          Input
        </h3>

        {/* Input type tabs */}
        <div style={{
          display: "flex", gap: "2px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "10px", padding: "3px", marginTop: "12px",
        }}>
          {INPUT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveInput(tab)}
              style={{
                flex: 1, padding: "7px", borderRadius: "7px", border: "none",
                cursor: "pointer", fontSize: "12px",
                fontWeight: activeInput === tab ? 600 : 400,
                background: activeInput === tab ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeInput === tab ? "#FFFFFF" : "rgba(255,255,255,0.3)",
                transition: "all 0.15s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div style={{ flex: 1 }}>

        {/* FILE */}
        {activeInput === "File" && (
          <div
            {...getRootProps()}
            style={{
              height: "180px",
              border: `2px dashed ${isDragActive ? "#E8590A" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "14px",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "10px", cursor: "pointer",
              background: isDragActive ? "rgba(232,89,10,0.05)" : "rgba(255,255,255,0.02)",
              transition: "all 0.2s",
            }}
          >
            <input {...getInputProps()} />
            {file ? (
              <>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: "rgba(232,89,10,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 3h8l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="#E8590A" strokeWidth="1.4"/>
                    <path d="M13 3v4h4" stroke="#E8590A" strokeWidth="1.4"/>
                  </svg>
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{file.name}</p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                </p>
              </>
            ) : (
              <>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4v9M7 7l3-3 3 3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 15h12" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
                  {isDragActive ? "Drop it here!" : "Drop file or click to browse"}
                </p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
                  PDF · DOCX · PPT · TXT · PNG · JPG — max 25MB
                </p>
              </>
            )}
          </div>
        )}

        {/* URL */}
        {activeInput === "URL" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              style={{
                width: "100%", padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "white", fontSize: "13px", outline: "none", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(232,89,10,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", paddingLeft: "4px" }}>
              Full page content will be extracted automatically
            </p>
          </div>
        )}

        {/* TEXT */}
        {activeInput === "Text" && (
          <div style={{ position: "relative" }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your content here... (min 5 words)"
              rows={7}
              style={{
                width: "100%", padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "white", fontSize: "13px", outline: "none",
                resize: "none", lineHeight: 1.6, boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(232,89,10,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <p style={{ position: "absolute", bottom: "10px", right: "12px", fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
              {text.trim() === "" ? "0" : text.trim().split(/\s+/).length} words
            </p>
          </div>
        )}
      </div>

      {/* Output type */}
      <div>
        <p style={{
          fontSize: "10px", fontWeight: 600,
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px",
        }}>
          Output type
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {OUTPUT_TYPES.map((o) => (
            <button
              key={o.id}
              onClick={() => setOutputType(o.id)}
              style={{
                padding: "5px 12px", borderRadius: "20px",
                border: `1px solid ${outputType === o.id ? "rgba(232,89,10,0.5)" : "rgba(255,255,255,0.08)"}`,
                background: outputType === o.id ? "rgba(232,89,10,0.15)" : "transparent",
                color: outputType === o.id ? "#E8590A" : "rgba(255,255,255,0.3)",
                fontSize: "11px", fontWeight: outputType === o.id ? 600 : 400,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        style={{
          width: "100%", padding: "13px", borderRadius: "12px",
          border: "none", background: "#E8590A",
          color: "white", fontSize: "14px", fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 0 24px rgba(232,89,10,0.35)",
          transition: "all 0.2s", letterSpacing: "-0.2px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#FF6B1A";
          e.currentTarget.style.boxShadow = "0 0 32px rgba(232,89,10,0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#E8590A";
          e.currentTarget.style.boxShadow = "0 0 24px rgba(232,89,10,0.35)";
        }}
      >
        {!isAuthenticated ? "Try Demo →" : "Generate Summary →"}
      </button>
    </div>
  );
}