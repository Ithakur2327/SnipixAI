"use client";
import { useState, useRef, useCallback } from "react";
import ResultPanel from "./ResultPanel";
import { documentAPI, summaryAPI } from "@/lib/api";
import { useDropzone } from "react-dropzone";

const OUTPUT_TYPES = [
  { id: "bullets",         label: "Bullets" },
  { id: "tldr",            label: "TL;DR" },
  { id: "key_insights",    label: "Key Insights" },
  { id: "action_points",   label: "Action Points" },
  { id: "section_summary", label: "Section View" },
];

const MIME_TO_SOURCE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ppt",
  "text/plain": "txt",
  "image/png": "image",
  "image/jpeg": "image",
};

type InputMode = "file" | "url" | "text";

export default function HeroSection() {
  const [result,      setResult]      = useState<string[] | null>(null);
  const [outputType,  setOutputType]  = useState("bullets");
  const [loading,     setLoading]     = useState(false);
  const [inputMode,   setInputMode]   = useState<InputMode>("text");
  const [text,        setText]        = useState("");
  const [url,         setUrl]         = useState("");
  const [file,        setFile]        = useState<File | null>(null);
  const [attachOpen,  setAttachOpen]  = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const attachRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setInputMode("file");
      setAttachOpen(false);
      setText("");
      setUrl("");
    }
  }, []);

  const { getRootProps, getInputProps, open: openFilePicker } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
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

  const handleGenerate = async () => {
    if (loading) return;
    setErrorMsg(null);
    const canSubmit =
      (inputMode === "text" && text.trim().split(/\s+/).length >= 5) ||
      (inputMode === "url"  && url.trim().length > 0) ||
      (inputMode === "file" && file !== null);
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    try {
      let documentId: string;
      if (inputMode === "file" && file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("sourceType", MIME_TO_SOURCE[file.type] ?? "pdf");
        fd.append("title", file.name);
        const { data } = await documentAPI.uploadFile(fd);
        documentId = data.data.documentId;
      } else if (inputMode === "url") {
        const { data } = await documentAPI.submitUrl(url.trim(), url.trim());
        documentId = data.data.documentId;
      } else {
        const { data } = await documentAPI.submitText(text.trim(), `Summary – ${new Date().toLocaleDateString()}`);
        documentId = data.data.documentId;
      }
      if (!documentId) throw new Error("Failed to create document.");
      let status = "extracting";
      let attempts = 0;
      let failMsg: string | null = null;
      while (status !== "ready" && status !== "failed" && attempts < 90) {
        await new Promise((r) => setTimeout(r, 2000));
        const { data: sd } = await documentAPI.status(documentId);
        status  = sd.data.status;
        failMsg = sd.data.errorMessage ?? null;
        attempts++;
      }
      if (status === "failed") throw new Error(failMsg ?? "Document processing failed.");
      if (attempts >= 90)      throw new Error("Processing timed out. Please try again.");
      const { data: sum } = await summaryAPI.create(documentId, outputType);
      const content = sum.data.content;
      if (Array.isArray(content)) {
        setResult(content.map((item: unknown) =>
          typeof item === "string" ? item : `${(item as {section:string}).section}: ${(item as {summary:string}).summary}`
        ));
      } else {
        setResult([String(content)]);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Something went wrong. Please try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const canSend =
    !loading &&
    ((inputMode === "text" && text.trim().split(/\s+/).length >= 5) ||
     (inputMode === "url"  && url.trim().length > 0) ||
     (inputMode === "file" && file !== null));

  const inputLabel =
    inputMode === "file" ? file?.name ?? "File selected"
    : inputMode === "url"  ? "Web URL"
    : "Text";

  return (
    <section style={{
      /* 85dvh leaves more space for taskbar and system UI */
      height: "85dvh",
      minHeight: "85dvh",
      display: "flex",
      flexDirection: "column",
      background: "#000000",
      /* Prevent the section itself from scrolling — content fits inside */
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&display=swap');

        @keyframes snx-hero-in {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes snx-underline {
          from { stroke-dashoffset: 320; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes snx-bar-in {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes snx-result-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes snx-attach-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes snx-chip-in {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }

        .snx-h1      { animation: snx-hero-in 0.65s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
        .snx-divider { animation: snx-hero-in 0.5s  cubic-bezier(0.22,1,0.36,1) 0.32s both; }
        .snx-sub     { animation: snx-hero-in 0.6s  cubic-bezier(0.22,1,0.36,1) 0.4s  both; }
        .snx-bar     { animation: snx-bar-in  0.7s  cubic-bezier(0.22,1,0.36,1) 0.28s both; }
        .snx-result  { animation: snx-result-in 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .snx-svg-line path { stroke-dasharray: 320; animation: snx-underline 0.9s cubic-bezier(0.22,1,0.36,1) 0.18s both; }

        .snx-attach-option {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 10px; border: none;
          background: transparent; cursor: pointer; width: 100%; text-align: left;
          color: rgba(255,255,255,0.7); font-size: 13px;
          transition: background 0.15s, color 0.15s;
        }
        .snx-attach-option:hover { background: rgba(247,55,79,0.08); color: #fff; }

        .snx-output-pill {
          padding: 5px 12px; border-radius: 20px; border: none;
          font-size: 11px; cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .snx-send-btn {
          width: 38px; height: 38px; border-radius: 10px; border: none;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; cursor: pointer; transition: all 0.2s;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── RESPONSIVE ─────────────────────────────────────── */
        @media (max-width: 768px) {
          .snx-hero-head { padding: 14px 16px 10px !important; }
          .snx-bar-wrap  { padding: 0 12px env(safe-area-inset-bottom, 16px) !important; padding-bottom: max(16px, env(safe-area-inset-bottom, 16px)) !important; }
          .snx-h1 { font-size: clamp(16px, 5vw, 24px) !important; white-space: normal !important; text-align: center; }
          .snx-out-row { flex-wrap: wrap; gap: 6px !important; }
          .snx-output-pill { font-size: 10px; padding: 4px 10px; }
          .snx-divider { margin: 10px auto 10px !important; }
        }
        @media (max-width: 480px) {
          .snx-textarea { font-size: 13px !important; }
          .snx-h1 { font-size: clamp(14px, 4.5vw, 20px) !important; }
        }

        /* Ensure the bottom bar is always visible above iOS home indicator */
        .snx-bar-wrap {
          padding-bottom: max(clamp(12px, 3vh, 40px), env(safe-area-inset-bottom, 0px));
        }
      `}</style>

      {/* ─── HEADING ─────────────────────────────────────────── */}
      <div className="snx-hero-head" style={{
        textAlign: "center",
        padding: "clamp(10px,2vw,20px) 24px clamp(8px,1vw,16px)",
        flexShrink: 0,
      }}>
        <h1 className="snx-h1" style={{
          fontFamily: "'Josefin Sans','Arial Black',sans-serif",
          fontSize: "clamp(18px, 2.4vw, 32px)",
          fontWeight: 700, lineHeight: 1.1, letterSpacing: "0.5px",
          margin: "0 0 4px", textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          <span style={{ color: "#FFFFFF" }}>Summarize </span>
          <span style={{ color: "#F7374F", position: "relative", display: "inline-block" }}>
            anything
            <svg viewBox="0 0 300 12" className="snx-svg-line" style={{ position: "absolute", bottom: "-2px", left: 0, width: "100%", height: "7px" }} preserveAspectRatio="none">
              <path d="M0 8 Q75 2 150 6 Q225 10 300 4" stroke="#F7374F" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
            </svg>
          </span>
          {/* INSTANTLY — brighter outline text */}
          <span style={{
            WebkitTextStroke: "1px rgba(255,255,255,0.45)",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}>{" "}Instantly.</span>
        </h1>

        <div className="snx-divider" style={{ width: "30px", height: "2px", background: "#F7374F", margin: "12px auto 10px", borderRadius: "2px" }} />

        <p className="snx-sub" style={{
          fontSize: "clamp(11px, 1.2vw, 14px)", color: "rgba(255,255,255,0.32)",
          maxWidth: "520px", margin: "0 auto 16px", lineHeight: 1.8,
        }}>
          Drop a{" "}
          <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, background: "rgba(255,255,255,0.05)", padding: "1px 7px", borderRadius: "4px", fontSize: "11px" }}>
            PDF · DOCX · URL · PPT · Image · Raw text
          </span>
          {" "}and get crisp summaries, key insights, and action points in seconds.
        </p>
      </div>

      {/* ─── MAIN BAR AREA ───────────────────────────────────── */}
      {/* flex:1 + justifyContent:flex-end pushes input to the bottom */}
      <div
        className="snx-bar-wrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",   /* ← key: pushes content to bottom */
          gap: "6px",
          padding: `0 clamp(12px,4vw,80px) clamp(8px,1.5vh,20px)`,
          /* never let this area itself scroll */
          overflow: "hidden",
          minHeight: 0,
        }}
      >

        {/* Output type row */}
        <div className="snx-out-row snx-bar" style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", flexWrap: "wrap", flexShrink: 0 }}>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginRight: "4px" }}>Output</span>
          {OUTPUT_TYPES.map((o) => (
            <button key={o.id} onClick={() => setOutputType(o.id)} className="snx-output-pill"
              style={{
                background:  outputType === o.id ? "rgba(247,55,79,0.15)" : "rgba(255,255,255,0.04)",
                border:      `1px solid ${outputType === o.id ? "rgba(247,55,79,0.45)" : "rgba(255,255,255,0.07)"}`,
                color:       outputType === o.id ? "#F7374F" : "rgba(255,255,255,0.3)",
                fontWeight:  outputType === o.id ? 600 : 400,
              }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* ── INPUT BOX ───────────────────────────────────────── */}
        <div className="snx-bar" style={{ animationDelay: "0.36s", maxWidth: "960px", width: "100%", margin: "0 auto", position: "relative", flexShrink: 0 }} {...getRootProps()}>
          <input {...getInputProps()} />
          <div style={{
            background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "18px", overflow: "visible",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.4)",
            position: "relative",
          }}>
            {/* File/URL chip */}
            {(inputMode === "file" || inputMode === "url") && (
              <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "7px",
                  background: "rgba(247,55,79,0.1)", border: "1px solid rgba(247,55,79,0.25)",
                  borderRadius: "8px", padding: "4px 10px",
                  animation: "snx-chip-in 0.2s ease both",
                }}>
                  {inputMode === "file" ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 1h6l2 2v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke="#F7374F" strokeWidth="1.2"/>
                      <path d="M7 1v2h2" stroke="#F7374F" strokeWidth="1.2"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5" stroke="#F7374F" strokeWidth="1.2"/>
                      <path d="M4 6h4M6 4v4" stroke="#F7374F" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inputLabel}
                  </span>
                  <button onClick={() => { setInputMode("text"); setFile(null); setUrl(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "0 0 0 2px", fontSize: "14px", lineHeight: 1 }}>×</button>
                </div>
              </div>
            )}

            {/* URL input */}
            {inputMode === "url" && (
              <div style={{ padding: "10px 16px 0" }}>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.75)", fontSize: "14px", padding: "0" }}/>
              </div>
            )}

            {/* Textarea — 3 rows */}
            {(inputMode === "text" || inputMode === "file") && (
              <textarea ref={textareaRef} className="snx-textarea"
                value={inputMode === "file" ? "" : text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={inputMode === "file" ? "File selected — choose output type and send ↑" : "Paste your content here, or use + to attach a file or URL…"}
                readOnly={inputMode === "file"}
                rows={3}
                style={{
                  width: "100%", background: "transparent", border: "none", outline: "none", resize: "none",
                  color: inputMode === "file" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
                  fontSize: "14px", lineHeight: 1.65, padding: "14px 16px",
                  fontFamily: "var(--font-inter), sans-serif",
                }}/>
            )}

            {/* Bottom bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {/* LEFT: attach + */}
              <div style={{ position: "relative" }}>
                <button onClick={(e) => { e.stopPropagation(); setAttachOpen((v) => !v); }}
                  style={{
                    width: "34px", height: "34px", borderRadius: "9px", border: "1px solid rgba(255,255,255,0.08)",
                    background: attachOpen ? "rgba(247,55,79,0.1)" : "rgba(255,255,255,0.04)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", color: attachOpen ? "#F7374F" : "rgba(255,255,255,0.4)", flexShrink: 0,
                  }} title="Attach file or URL">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </button>

                {attachOpen && (
                  <div ref={attachRef} onClick={(e) => e.stopPropagation()} style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: 0,
                    background: "#0C0C0C", border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "14px", padding: "6px", minWidth: "210px",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                    zIndex: 50, animation: "snx-attach-pop 0.18s ease both",
                  }}>
                    <button className="snx-attach-option" onClick={() => { openFilePicker(); setAttachOpen(false); }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "rgba(247,55,79,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 1h7l3 3v9H3V1z" stroke="#F7374F" strokeWidth="1.3"/>
                          <path d="M9 1v3h3" stroke="#F7374F" strokeWidth="1.3"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Upload File</p>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>PDF · DOCX · PPT · TXT · Image</p>
                      </div>
                    </button>
                    <button className="snx-attach-option" onClick={() => { setInputMode("url"); setFile(null); setText(""); setAttachOpen(false); }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="5.5" stroke="#818CF8" strokeWidth="1.3"/>
                          <path d="M4.5 7c0-1.5.8-2.5 2.5-2.5s2.5 1 2.5 2.5-.8 2.5-2.5 2.5" stroke="#818CF8" strokeWidth="1.3" strokeLinecap="round"/>
                          <path d="M2 7h10" stroke="#818CF8" strokeWidth="1.1" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Web URL</p>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>Extract from any webpage</p>
                      </div>
                    </button>
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "5px 0" }} />
                    <div style={{ padding: "4px 10px 6px" }}>
                      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>Or type / paste text directly in the box above</p>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: word count + send */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {inputMode === "text" && text.trim().length > 0 && (
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)" }}>
                    {text.trim().split(/\s+/).length} words
                  </span>
                )}
                <button className="snx-send-btn"
                  onClick={() => { setAttachOpen(false); handleGenerate(); }}
                  disabled={!canSend}
                  style={{
                    background:  canSend ? "#F7374F" : "rgba(247,55,79,0.2)",
                    boxShadow:   canSend ? "0 0 20px rgba(247,55,79,0.4)" : "none",
                    cursor:      canSend ? "pointer" : "not-allowed",
                  }}
                  title="Generate summary (Ctrl + Enter)">
                  {loading ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
                      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"/>
                      <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 13V3M4 7l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── ERROR ── */}
        {errorMsg && !loading && (
          <div style={{
            maxWidth: "960px", width: "100%", margin: "0 auto",
            padding: "12px 16px", borderRadius: "12px",
            background: "rgba(247,55,79,0.08)", border: "1px solid rgba(247,55,79,0.2)",
            display: "flex", alignItems: "center", gap: "10px",
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke="#F7374F" strokeWidth="1.3"/>
              <path d="M7 4v3M7 9.5h.01" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", flex: 1 }}>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: "16px" }}>×</button>
          </div>
        )}

        {/* ── RESULT PANEL ── */}
        {(result || loading) && (
          <div className="snx-result" style={{ maxWidth: "960px", width: "100%", margin: "0 auto", flexShrink: 0 }}>
            <div style={{
              background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "18px", padding: "clamp(16px,3vw,28px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              <ResultPanel result={result} outputType={outputType} loading={loading} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}