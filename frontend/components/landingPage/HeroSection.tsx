"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Paperclip, Plus, Send, UploadCloud, X } from "lucide-react";
import { documentAPI, getApiErrorMessage } from "@/lib/api";
import DocumentChat from "@/components/chat/DocumentChat";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HeroSection() {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  const onDrop = useCallback((accepted: File[], rejections: FileRejection[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setContent("");
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

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    maxSize: 50 * 1024 * 1024,
    accept: ACCEPTED,
  });

  const trimmedContent = content.trim();
  const isUrl = !file && looksLikeUrl(trimmedContent);
  const wordCount = trimmedContent ? trimmedContent.split(/\s+/).filter(Boolean).length : 0;
  const canSend = !loading && (file !== null || (trimmedContent.length > 0 && (isUrl || wordCount >= 5)));

  const autoResize = useCallback((el: HTMLTextAreaElement | null, max = 160) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  useEffect(() => { autoResize(textareaRef.current); }, [content, autoResize]);
  useEffect(() => { autoResize(instructionsRef.current, 90); }, [instructions, autoResize]);
  useEffect(() => {
    if (showInstructions) requestAnimationFrame(() => instructionsRef.current?.focus());
  }, [showInstructions]);

  const handleGenerate = async () => {
    if (!canSend) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      let newDocId: string;
      if (file) {
        const { data } = await documentAPI.uploadFile(file);
        newDocId = data.data.document.id;
      } else if (isUrl) {
        const { data } = await documentAPI.createFromUrl(trimmedContent);
        newDocId = data.data.document.id;
      } else {
        const { data } = await documentAPI.createFromText(trimmedContent, `Summary – ${new Date().toLocaleDateString()}`);
        newDocId = data.data.document.id;
      }
      setDocumentId(newDocId);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Only auto-submit on Enter when the field looks like a finished URL
    // (single line, no spaces) — a pasted/typed article can span many
    // lines, so Enter must stay a normal newline for raw text.
    if (e.key === "Enter" && !e.shiftKey && isUrl) {
      e.preventDefault();
      void handleGenerate();
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleCloseChat = () => {
    setDocumentId(null);
    setErrorMsg(null);
    setContent("");
    setFile(null);
    setInstructions("");
    setShowInstructions(false);
  };

  return (
    <section style={{ minHeight: "calc(100dvh - 64px)", display: "flex", alignItems: "center", background: "#000000", padding: "clamp(28px,5vw,64px) clamp(16px,4vw,64px)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&display=swap');
        @keyframes snx-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .snx-l1 { animation: snx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .snx-l2 { animation: snx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .snx-r1 { animation: snx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both; }

        .snx-composer { position: relative; transition: border-color 0.2s ease; }
        .snx-composer.drag { border-color: rgba(247,55,79,0.55) !important; }

        .snx-composer-textarea {
          width: 100%; background: transparent; border: none; outline: none; resize: none;
          color: #fff; font-size: 14.5px; line-height: 1.6; font-family: var(--font-inter), sans-serif;
          padding: 2px 2px 4px;
        }
        .snx-composer-textarea::placeholder { color: rgba(255,255,255,0.32); }

        .snx-instructions-textarea {
          width: 100%; background: transparent; border: none; outline: none; resize: none;
          color: rgba(255,255,255,0.82); font-size: 12.5px; line-height: 1.55; font-family: var(--font-inter), sans-serif;
          padding: 0;
        }
        .snx-instructions-textarea::placeholder { color: rgba(255,255,255,0.28); }

        .snx-toolbar-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 11px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.55);
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          font-family: var(--font-inter), sans-serif;
        }
        .snx-toolbar-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .snx-toolbar-btn.active { color: #F7374F; border-color: rgba(247,55,79,0.35); background: rgba(247,55,79,0.08); }
        .snx-attach-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.55); cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .snx-attach-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }

        .snx-send-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .snx-send-btn:not(:disabled):hover { transform: translateY(-1px); }
        .snx-send-btn:not(:disabled):active { transform: scale(0.94); }

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
          <p className="snx-l2" style={{ fontSize: "clamp(14px, 1.5vw, 16px)", color: "rgba(255,255,255,0.35)", lineHeight: 1.8, maxWidth: "460px", margin: "0" }}>
            Upload a PDF, paste a link, or drop in raw text. Then chat with it naturally — ask for exactly the summary you want, quiz yourself on it, or dig into the details.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`snx-r1 snx-composer${isDragActive ? " drag" : ""}`}
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "20px",
            padding: "16px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          <input {...getInputProps()} />

          <AnimatePresence>
            {isDragActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute", inset: 0, zIndex: 5, borderRadius: "19px",
                  background: "rgba(6,6,6,0.92)", border: "2px dashed rgba(247,55,79,0.55)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px",
                }}
              >
                <UploadCloud size={26} color="#F7374F" />
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>Drop your file here</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ minHeight: "84px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {file ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px", padding: "10px 12px",
                }}
              >
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(247,55,79,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={15} color="#F7374F" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.32)" }}>{formatFileSize(file.size)}</p>
                </div>
                <button onClick={removeFile} aria-label="Remove file" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "7px", border: "none", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </motion.div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste a link, or type / paste your text here…"
                rows={1}
                className="snx-composer-textarea"
              />
            )}
          </div>

          <AnimatePresence initial={false}>
            {showInstructions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "8px", paddingTop: "10px" }}>
                  <textarea
                    ref={instructionsRef}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Add instructions — e.g. bullet points, ELI5, focus on the results…"
                    rows={1}
                    className="snx-instructions-textarea"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {errorMsg && (
            <p style={{ marginTop: "10px", fontSize: "12px", color: "rgba(255,255,255,0.6)", background: "rgba(247,55,79,0.08)", border: "1px solid rgba(247,55,79,0.2)", borderRadius: "10px", padding: "9px 11px" }}>
              {errorMsg}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button type="button" className="snx-attach-btn" onClick={open} title="Attach a file" aria-label="Attach a file">
                <Paperclip size={15} />
              </button>
              <button
                type="button"
                className={`snx-toolbar-btn${showInstructions ? " active" : ""}`}
                onClick={(e) => { e.stopPropagation(); setShowInstructions((v) => !v); }}
                title="Add instructions for the summary"
              >
                <Plus size={13} />
                Instructions
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canSend}
              className="snx-send-btn"
              aria-label="Generate summary"
              title="Generate summary"
              style={{
                background: canSend ? "#F7374F" : "rgba(247,55,79,0.2)",
                boxShadow: canSend ? "0 0 18px rgba(247,55,79,0.35)" : "none",
                cursor: canSend ? "pointer" : "not-allowed",
              }}
            >
              {loading ? <Loader2 size={15} color="#fff" className="animate-spin" /> : <Send size={15} color="#fff" />}
            </button>
          </div>

          <p style={{ marginTop: "10px", fontSize: "10.5px", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            PDF · DOCX · PPT · TXT · Image · or paste a link — up to 50MB
          </p>
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