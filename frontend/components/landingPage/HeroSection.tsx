"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Paperclip, Send, UploadCloud, X } from "lucide-react";
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
  const [summaryInstruction, setSummaryInstruction] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatTransitionTimerRef = useRef<number | null>(null);

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

  const autoResize = useCallback((el: HTMLTextAreaElement | null, max = 140) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  useEffect(() => { autoResize(textareaRef.current); }, [content, autoResize]);

  const handleGenerate = async () => {
    if (!canSend) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      let newDocId: string;
      if (file) {
        const { data } = await documentAPI.uploadFile(file, summaryInstruction);
        newDocId = data.data.document.id;
      } else if (isUrl) {
        const { data } = await documentAPI.createFromUrl(trimmedContent, undefined, summaryInstruction);
        newDocId = data.data.document.id;
      } else {
        const { data } = await documentAPI.createFromText(
          trimmedContent,
          `Summary – ${new Date().toLocaleDateString()}`,
          summaryInstruction,
        );
        newDocId = data.data.document.id;
      }
      setIsOpeningChat(true);
      chatTransitionTimerRef.current = window.setTimeout(() => {
        setDocumentId(newDocId);
        setIsOpeningChat(false);
      }, 320);
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
    if (chatTransitionTimerRef.current !== null) {
      window.clearTimeout(chatTransitionTimerRef.current);
      chatTransitionTimerRef.current = null;
    }
    setIsOpeningChat(false);
    setDocumentId(null);
    setErrorMsg(null);
    setContent("");
    setSummaryInstruction("");
    setFile(null);
  };

  useEffect(() => () => {
    if (chatTransitionTimerRef.current !== null) {
      window.clearTimeout(chatTransitionTimerRef.current);
    }
  }, []);

  return (
    <section
      style={{
        minHeight: "calc(100dvh - 64px)",
        display: "flex",
        alignItems: "center",
        background: "#000000",
        padding: "clamp(24px,6vw,60px) clamp(16px,5vw,64px)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&display=swap');

        /* ===== 8K-crisp rendering: sharp edges, no blurry antialiasing ===== */
        .snx-v10-wrap, .snx-v10-wrap * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        @keyframes snx-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .snx-l0 { animation: snx-in 0.55s cubic-bezier(0.22,1,0.36,1) 0s both; }
        .snx-l1 { animation: snx-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
        .snx-l2 { animation: snx-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
        .snx-l3 { animation: snx-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.24s both; }

        .snx-v10-wrap { max-width: 720px; margin: 0 auto; width: 100%; text-align: center; position: relative; }
        .snx-v10-wrap > * { position: relative; z-index: 1; }
        .snx-v10-wrap h1 { text-shadow: 0 2px 0 rgba(255,255,255,0.1), 0 8px 22px rgba(0,0,0,0.75); }
        .snx-v10-wrap > p { text-shadow: 0 1px 10px rgba(255,255,255,0.08); }
        .snx-hero-copy { width: min(100%, 520px); margin-left: auto; margin-right: auto; }
        .snx-hero-composer { width: min(100%, 720px); max-width: 100%; }
        .snx-hero-transition h1, .snx-hero-transition .snx-hero-copy {
          opacity: 0; transform: translateY(-12px); transition: opacity 0.24s ease, transform 0.24s ease;
        }
        .snx-hero-transition .snx-hero-composer {
          transform: translateY(72px) scaleY(0.62); transform-origin: top center;
          transition: transform 0.32s cubic-bezier(0.22,1,0.36,1), box-shadow 0.32s ease;
          box-shadow: 0 6px 16px rgba(0,0,0,0.45) !important;
        }

        .snx-v10-before {
          color: rgba(255,255,255,0.52);
          text-decoration: line-through;
          text-decoration-color: #F7374F;
          text-decoration-thickness: 3px;
          text-underline-offset: 2px;
          text-shadow: 0 1px 0 rgba(255,255,255,0.05), 0 2px 10px rgba(0,0,0,0.45);
        }

        .snx-v10-accent {
          text-shadow:
            0 1px 0 rgba(255,255,255,0.12),
            0 2px 6px rgba(0,0,0,0.6);
        }

        .snx-composer {
          position: relative;
          text-align: left;
          transition: border-color 0.2s ease, box-shadow 0.25s ease, transform 0.25s ease;
          box-shadow: 0 14px 36px rgba(0,0,0,0.72), 0 2px 12px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.13);
        }
        .snx-composer.drag { border-color: rgba(247,55,79,0.55) !important; }
        @media (hover: hover) {
          .snx-composer:hover { transform: translateY(-2px); box-shadow: 0 20px 46px rgba(0,0,0,0.78), 0 4px 18px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.17); }
        }

        .snx-composer-textarea {
          width: 100%; background: transparent; border: none; outline: none; resize: none;
          color: #fff; font-size: 14px; line-height: 1.55; font-family: var(--font-inter), sans-serif;
          padding: 2px 2px 3px;
        }
        .snx-composer-textarea::placeholder { color: rgba(255,255,255,0.36); text-shadow: none; }

        .snx-toolbar-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 30px; padding: 0 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.055); color: rgba(255,255,255,0.74);
          font-size: 11.5px; font-weight: 600; cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
          font-family: var(--font-inter), sans-serif;
          white-space: nowrap;
        }
        .snx-toolbar-btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .snx-toolbar-btn.active { color: #F7374F; border-color: rgba(247,55,79,0.35); background: rgba(247,55,79,0.08); }

        .snx-attach-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.055); color: rgba(255,255,255,0.74); cursor: pointer;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .snx-attach-btn:hover { background: rgba(255,255,255,0.09); color: #fff; }

        .snx-send-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 34px; height: 32px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s, filter 0.15s;
          box-shadow: 0 1px 0 rgba(255,255,255,0.45) inset, 0 -3px 4px rgba(0,0,0,0.28) inset, 0 4px 9px rgba(0,0,0,0.35);
          flex-shrink: 0;
        }
        .snx-send-btn:not(:disabled):hover { transform: translateY(-1.5px); filter: brightness(1.08); box-shadow: 0 1px 0 rgba(255,255,255,0.55) inset, 0 -3px 4px rgba(0,0,0,0.25) inset, 0 7px 14px rgba(247,55,79,0.36); }
        .snx-send-btn:not(:disabled):active { transform: translateY(1px) scale(0.94); box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 -1px 2px rgba(0,0,0,0.35) inset, 0 2px 4px rgba(0,0,0,0.35); }

        /* ===== Responsive scaling ===== */
        @media (max-width: 640px) {
          .snx-v10-wrap { width: min(100%, 720px); padding: 0 4px; transform: translateY(clamp(-46px, -9vw, -28px)); }
          .snx-v10-wrap > p { line-height: 1.6; }
          .snx-composer { margin-top: clamp(54px, 12vw, 70px) !important; }
          .snx-composer-textarea { font-size: clamp(12px, 3.2vw, 13px) !important; line-height: 1.45; }
          .snx-toolbar-row { gap: 6px !important; }
          .snx-toolbar-btn span.snx-btn-label { display: none; }
          .snx-toolbar-btn { width: 30px; padding: 0; justify-content: center; }
        }

        @media (min-width: 641px) and (max-width: 768px) {
          .snx-v10-wrap { transform: translateY(-28px); }
          .snx-composer { margin-top: 56px !important; }
          .snx-composer-textarea { font-size: 13px !important; line-height: 1.45; }
        }

        @media (max-width: 400px) {
          .snx-composer { padding: 11px !important; border-radius: 15px !important; }
          .snx-composer { margin-top: 52px !important; }
          .snx-composer-textarea { font-size: 12px !important; line-height: 1.4; }
          .snx-v10-wrap { padding: 0; }
        }

        @media (min-width: 1180px) {
          .snx-v10-wrap { max-width: 760px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .snx-l0, .snx-l1, .snx-l2, .snx-l3 { animation: none !important; }
          .snx-composer:hover { transform: none !important; }
        }
      `}</style>

      <div className={`snx-v10-wrap${isOpeningChat ? " snx-hero-transition" : ""}`}>
        <h1
          className="snx-l0"
          style={{
            fontFamily: "'Josefin Sans','Arial Black',sans-serif",
            fontSize: "clamp(24px, 5vw, 42px)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "0.5px",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          <span className="snx-v10-before">Hours of reading.</span>
        </h1>

        <h1
          className="snx-l1 snx-v10-accent"
          style={{
            fontFamily: "'Josefin Sans','Arial Black',sans-serif",
            fontSize: "clamp(24px, 5vw, 42px)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "0.5px",
            margin: "2px 0 0",
            textTransform: "uppercase",
            color: "#F7374F",
          }}
        >
          Instant clarity.
        </h1>

        <p
          className="snx-l2 snx-hero-copy"
          style={{
            fontSize: "clamp(13px, 1.6vw, 16px)",
            color: "rgba(255,255,255,0.42)",
            lineHeight: 1.75,
            maxWidth: "100%",
            margin: "clamp(14px, 3vw, 20px) auto 0",
            padding: "0 8px",
          }}
        >
          SnipixAI reads your PDFs, docs, slides, images, or links and turns them into a
          clear summary — then chats with you about it, and builds a quiz to test what stuck.
        </p>

        <div
          {...getRootProps()}
          className={`snx-l3 snx-composer snx-hero-composer${isDragActive ? " drag" : ""}`}
          style={{
            background: "linear-gradient(180deg, #0D0D0F 0%, #070708 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "13px 15px",
            boxShadow: [
              "0 1px 0 rgba(255,255,255,0.07) inset",
              "0 -1px 0 rgba(0,0,0,0.5) inset",
              "0 1px 2px rgba(0,0,0,0.9)",
              "0 18px 38px -14px rgba(0,0,0,0.7)",
              "0 10px 30px -8px rgba(247,55,79,0.1)",
            ].join(", "),
            marginTop: "clamp(22px, 4vw, 34px)",
            width: "100%",
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
                <UploadCloud size={24} color="#F7374F" />
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>Drop your file here</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ minHeight: "50px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {file ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px", padding: "9px 11px",
                }}
              >
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(247,55,79,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={14} color="#F7374F" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.52)" }}>{formatFileSize(file.size)}</p>
                </div>
                <button onClick={removeFile} aria-label="Remove file" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "7px", border: "none", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </motion.div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a file, link, or text to begin…"
                rows={1}
                className="snx-composer-textarea"
              />
            )}
          </div>

          <input
            value={summaryInstruction}
            onChange={(e) => setSummaryInstruction(e.target.value)}
            placeholder="Optional: e.g. explain in detail, include every topic and example"
            maxLength={1000}
            aria-label="Summary preference"
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "9px 10px",
              borderRadius: "9px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#fff",
              outline: "none",
              boxSizing: "border-box",
              fontSize: "12px",
            }}
          />

          {errorMsg && (
            <p style={{ marginTop: "9px", fontSize: "12px", color: "rgba(255,255,255,0.6)", background: "rgba(247,55,79,0.08)", border: "1px solid rgba(247,55,79,0.2)", borderRadius: "10px", padding: "8px 10px" }}>
              {errorMsg}
            </p>
          )}

          <div
            className="snx-toolbar-row"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <button type="button" className="snx-attach-btn" onClick={open} title="Attach a file" aria-label="Attach a file">
                <Paperclip size={14} />
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
                boxShadow: canSend ? "0 1px 0 rgba(255,255,255,0.45) inset, 0 -3px 4px rgba(0,0,0,0.28) inset, 0 5px 14px rgba(247,55,79,0.38)" : "none",
                cursor: canSend ? "pointer" : "not-allowed",
              }}
            >
              {loading ? <Loader2 size={14} color="#fff" className="animate-spin" /> : <Send size={14} color="#fff" />}
            </button>
          </div>

            <p style={{ marginTop: "clamp(8px, 1.5vw, 12px)", fontSize: "10px", color: "rgba(255,255,255,0.42)", textAlign: "center" }}>
            Any doc, image, or link · up to 50MB — SnipixAI also generates a quiz or test from it in one click
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
            enterAnimation
          />
        )}
      </AnimatePresence>
    </section>
  );
}
