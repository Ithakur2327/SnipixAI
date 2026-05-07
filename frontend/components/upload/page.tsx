"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { documentAPI } from "@/lib/api";
import { OutputType } from "@/types";
import UploadDropzone from "@/components/upload/UploadDropzone";
import OutputTypeSelector from "@/components/upload/OutputTypeSelector";
import UrlInput from "@/components/upload/UrlInput";
import RawTextInput from "@/components/upload/RawTextInput";

type UploadMethod = "file" | "url" | "text";

const METHODS: { id: UploadMethod; label: string; icon: string; desc: string }[] = [
  { id: "file", label: "File upload", icon: "📁", desc: "PDF, DOCX, PPT, TXT, Image" },
  { id: "url",  label: "Web URL",     icon: "🌐", desc: "Any webpage or article" },
  { id: "text", label: "Raw text",    icon: "📝", desc: "Paste text directly" },
];

export default function UploadPage() {
  const router = useRouter();
  const [method, setMethod]         = useState<UploadMethod>("file");
  const [outputType, setOutputType] = useState<OutputType>("bullets");
  const [file, setFile]             = useState<File | null>(null);
  const [url, setUrl]               = useState("");
  const [text, setText]             = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      let res;
      if (method === "file") {
        if (!file) { setError("Please select a file"); setLoading(false); return; }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("outputType", outputType);
        res = await documentAPI.uploadFile(formData);
      } else if (method === "url") {
        if (!url) { setError("Please enter a URL"); setLoading(false); return; }
        res = await documentAPI.submitUrl(url);
      } else {
        if (!text || text.trim().split(/\s+/).length < 10) {
          setError("Please enter at least 10 words of text");
          setLoading(false);
          return;
        }
        res = await documentAPI.submitText(text);
      }
      const { documentId } = res.data.data;
      router.push(`/document/${documentId}?outputType=${outputType}`);
    } catch (err: any) {
      setError(err?.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px", marginBottom: "4px" }}>
          New Summary
        </h2>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
          Choose your input method and output type
        </p>
      </div>

      {/* Method selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "24px" }}>
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            style={{
              borderRadius: "14px", padding: "16px", textAlign: "left",
              border: `1px solid ${method === m.id ? "rgba(232,89,10,0.5)" : "rgba(255,255,255,0.08)"}`,
              background: method === m.id ? "rgba(232,89,10,0.1)" : "rgba(255,255,255,0.03)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "22px" }}>{m.icon}</span>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF", marginTop: "8px", marginBottom: "2px" }}>{m.label}</p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ marginBottom: "20px" }}>
        {method === "file" && <UploadDropzone file={file} onFileChange={setFile} />}
        {method === "url"  && <UrlInput value={url} onChange={setUrl} />}
        {method === "text" && <RawTextInput value={text} onChange={setText} />}
      </div>

      {/* Output type */}
      <OutputTypeSelector value={outputType} onChange={setOutputType} />

      {/* Error */}
      {error && (
        <div style={{ margin: "12px 0", padding: "12px 16px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%", padding: "14px", borderRadius: "14px", marginTop: "16px",
          background: loading ? "rgba(232,89,10,0.5)" : "#E8590A",
          color: "#fff", fontSize: "14px", fontWeight: 700, border: "none",
          cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
          boxShadow: loading ? "none" : "0 0 20px rgba(232,89,10,0.3)",
        }}
      >
        {loading ? "Uploading & processing..." : "Generate summary →"}
      </button>
    </div>
  );
}