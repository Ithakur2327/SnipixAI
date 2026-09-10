"use client";
import { useCallback, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AnimatePresence } from "framer-motion";
import { FileText, Globe, Type, UploadCloud, X } from "lucide-react";
import { documentAPI, getApiErrorMessage } from "@/lib/api";
import DocumentChat from "@/components/chat/DocumentChat";

type InputMode = "file" | "url" | "text";

const MODES: { id: InputMode; label: string; icon: typeof FileText }[] = [
  { id: "file", label: "File", icon: UploadCloud },
  { id: "url", label: "URL", icon: Globe },
  { id: "text", label: "Text", icon: Type },
];

export default function HeroSection() {
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  const onDrop = useCallback((accepted: File[], rejections: FileRejection[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setErrorMsg(null);
      return;
    }
    const reason = rejections[0]?.errors[0]?.code;
    if (reason === "file-too-large") {
      setErrorMsg("That file is too large. Please upload something under 50MB.");
    } else if (reason === "file-invalid-type") {
      setErrorMsg("Unsupported file type. Please upload a PDF, DOCX, PPTX, TXT, PNG, or JPG.");
    } else if (rejections.length > 0) {
      setErrorMsg("That file couldn't be uploaded. Please try a different one.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 50 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "text/plain": [".txt"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  });

  const canSend =
    !loading &&
    ((inputMode === "text" && text.trim().split(/\s+/).length >= 5) ||
      (inputMode === "url" && url.trim().length > 0) ||
      (inputMode === "file" && file !== null));

  const handleGenerate = async () => {
    if (!canSend) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      let newDocId: string;
      if (inputMode === "file" && file) {
        const { data } = await documentAPI.uploadFile(file);
        newDocId = data.data.document.id;
      } else if (inputMode === "url") {
        const { data } = await documentAPI.createFromUrl(url.trim());
        newDocId = data.data.document.id;
      } else {
        const { data } = await documentAPI.createFromText(text.trim(), `Summary – ${new Date().toLocaleDateString()}`);
        newDocId = data.data.document.id;
      }
      setDocumentId(newDocId);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseChat = () => {
    setDocumentId(null);
    setErrorMsg(null);
    setText("");
    setUrl("");
    setFile(null);
    setInstructions("");
    setInputMode("file");
  };

  return (
    <section style={{ minHeight: "calc(100dvh - 64px)", display: "flex", alignItems: "center", background: "#000000", padding: "clamp(28px,5vw,64px) clamp(16px,4vw,64px)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&display=swap');
        @keyframes snx-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .snx-l1 { animation: snx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .snx-l2 { animation: snx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .snx-l3 { animation: snx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .snx-r1 { animation: snx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .snx-mode-btn { transition: all 0.15s; }
        .snx-panel-input { transition: border-color 0.15s, background 0.15s; }
        .snx-panel-input:focus { border-color: rgba(247,55,79,0.4) !important; background: rgba(255,255,255,0.05) !important; }
        .snx-dropzone { transition: border-color 0.2s, background 0.2s; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .snx-hero-grid { grid-template-columns: 1fr !important; }
          .snx-hero-left { text-align: center; }
        }
      `}</style>

      <div className="snx-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(32px,5vw,72px)", maxWidth: "1180px", margin: "0 auto", width: "100%", alignItems: "center" }}>
        <div className="snx-hero-left">
          <h1
            className="snx-l1"
            style={{
              fontFamily: "'Josefin Sans','Arial Black',sans-serif",
              fontSize: "clamp(28px, 3.6vw, 46px)",
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "0.5px",
              margin: "0 0 18px",
              textTransform: "uppercase",
              color: "#FFFFFF",
            }}
          >
            Summarize <span style={{ color: "#F7374F" }}>anything</span>, instantly
          </h1>
          <p className="snx-l2" style={{ fontSize: "clamp(14px, 1.5vw, 16px)", color: "rgba(255,255,255,0.35)", lineHeight: 1.8, maxWidth: "460px", margin: "0 0 28px" }}>
            Upload a PDF, paste a link, or drop in raw text. Then chat with it naturally — ask for exactly the summary you want, quiz yourself on it, or dig into the details.
          </p>
          <div className="snx-l3" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {["PDF", "DOCX", "PPT", "URL", "Image", "Text"].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.45)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "7px",
                  padding: "5px 11px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div
          className="snx-r1"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "20px",
            padding: "20px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "3px" }}>
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = inputMode === m.id;
              return (
                <button
                  key={m.id}
                  className="snx-mode-btn"
                  onClick={() => {
                    setInputMode(m.id);
                    setErrorMsg(null);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "9px 0",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    background: active ? "rgba(247,55,79,0.14)" : "transparent",
                    color: active ? "#F7374F" : "rgba(255,255,255,0.4)",
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  <Icon size={14} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {inputMode === "file" && (
            <div
              {...getRootProps()}
              className="snx-dropzone"
              style={{
                border: `1.5px dashed ${isDragActive ? "rgba(247,55,79,0.5)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: "14px",
                padding: "28px 16px",
                textAlign: "center",
                cursor: "pointer",
                background: isDragActive ? "rgba(247,55,79,0.04)" : "transparent",
                minHeight: "120px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <input {...getInputProps()} />
              {file ? (
                <>
                  <FileText size={22} color="#F7374F" />
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <X size={11} /> Remove
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud size={22} color="rgba(255,255,255,0.3)" />
                  <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.4)" }}>
                    Drop a file here, or <span style={{ color: "#F7374F", fontWeight: 600 }}>browse</span>
                  </p>
                  <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.2)" }}>PDF · DOCX · PPT · TXT · Image, up to 50MB</p>
                </>
              )}
            </div>
          )}

          {inputMode === "url" && (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="snx-panel-input"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "14px",
                color: "#fff",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          )}

          {inputMode === "text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your content here…"
              rows={5}
              className="snx-panel-input"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "14px",
                color: "#fff",
                fontSize: "13.5px",
                lineHeight: 1.6,
                outline: "none",
                resize: "none",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            />
          )}

          <div style={{ marginTop: "12px" }}>
            <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "6px", display: "block" }}>
              How should I summarize it? (optional)
            </label>
            <textarea
              ref={instructionsRef}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. bullet points, ELI5, focus on the results…"
              rows={1}
              className="snx-panel-input"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                padding: "10px 12px",
                color: "#fff",
                fontSize: "12.5px",
                outline: "none",
                resize: "none",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            />
          </div>

          {errorMsg && (
            <p style={{ marginTop: "12px", fontSize: "12px", color: "rgba(255,255,255,0.6)", background: "rgba(247,55,79,0.08)", border: "1px solid rgba(247,55,79,0.2)", borderRadius: "10px", padding: "10px 12px" }}>
              {errorMsg}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canSend}
            style={{
              width: "100%",
              marginTop: "14px",
              padding: "13px",
              borderRadius: "12px",
              border: "none",
              background: canSend ? "#F7374F" : "rgba(247,55,79,0.25)",
              color: "#fff",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: canSend ? "pointer" : "not-allowed",
              boxShadow: canSend ? "0 0 22px rgba(247,55,79,0.35)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              "Generate summary"
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {documentId && (
          <DocumentChat
            key={documentId}
            documentId={documentId}
            onClose={handleCloseChat}
            variant="overlay"
            initialMessage={instructions}
            enterAnimation
          />
        )}
      </AnimatePresence>
    </section>
  );
}