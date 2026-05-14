"use client";
import { useEffect, useRef, useState } from "react";

function useVisible(threshold = 0.06) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center",
      background: "rgba(247,55,79,0.08)", border: "1px solid rgba(247,55,79,0.22)",
      borderRadius: "8px", padding: "5px 14px", marginBottom: "20px",
    }}>
      <span style={{ fontSize: "10px", color: "#F7374F", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        {text}
      </span>
    </div>
  );
}

const FEATURES = [
  {
    id: "formats",
    label: "Multi-Format Ingestion",
    detail: "PDF, DOCX, PPT, TXT, URL, Image, Plain Text — text is extracted and normalised automatically regardless of source.",
    tag: "Input Layer",
    children: [
      { label: "File upload",     note: "PDF · DOCX · PPTX · TXT · PNG · JPG — up to 25 MB" },
      { label: "Web URL scraping",note: "Full-page content extracted via headless browser" },
      { label: "Raw text paste",  note: "Paste directly into the input bar, no file needed" },
      { label: "OCR support",     note: "Scanned images and image-based PDFs handled automatically" },
    ],
  },
  {
    id: "rag",
    label: "RAG Pipeline",
    detail: "Documents are chunked with overlapping windows, embedded into a vector database, and retrieved semantically at query time — grounded answers, zero hallucinations.",
    tag: "AI Core",
    children: [
      { label: "Smart chunking",      note: "Overlapping sliding windows preserve cross-boundary context" },
      { label: "LLM embeddings",      note: "High-dimensional vectors capture semantic meaning" },
      { label: "Pinecone vector DB",  note: "Per-user namespaced index for sub-millisecond retrieval" },
      { label: "Top-k semantic search", note: "Most relevant chunks surfaced for every query" },
    ],
  },
  {
    id: "output",
    label: "5 Structured Output Formats",
    detail: "Pick the format that fits your workflow. From a single-line TL;DR to a full section-by-section breakdown — generated in one click.",
    tag: "Output Layer",
    children: [
      { label: "TL;DR",            note: "One-paragraph executive summary" },
      { label: "Bullet points",    note: "6–10 scannable, numbered key points" },
      { label: "Key insights",     note: "Strategic patterns and analytical takeaways" },
      { label: "Action points",    note: "Extracted tasks, decisions, and next steps" },
      { label: "Section summary",  note: "Topic-by-topic hierarchical breakdown" },
    ],
  },
  {
    id: "chat",
    label: "Document Chat (RAG Q&A)",
    detail: "Ask any follow-up question after summarising. The RAG pipeline retrieves the most relevant chunks and answers with source-level precision.",
    tag: "Interaction",
    children: [
      { label: "Conversational Q&A",  note: "Full multi-turn chat history per document" },
      { label: "Cited chunk retrieval", note: "Every answer references actual source passages" },
      { label: "Context-aware replies", note: "Prior messages inform subsequent answers" },
    ],
  },
  {
    id: "privacy",
    label: "Per-User Data Isolation",
    detail: "Every user's vectors are namespaced independently in Pinecone. Your documents are never co-mingled with another user's data.",
    tag: "Security",
    children: [
      { label: "Namespaced vectors",  note: "Strict Pinecone namespace per user ID" },
      { label: "JWT authentication",  note: "Stateless, short-lived token-based access control" },
      { label: "Zero data leakage",   note: "No cross-user vector contamination by design" },
    ],
  },
  {
    id: "speed",
    label: "Fast & Scalable Architecture",
    detail: "Built on a Node.js + TypeScript backend with async processing pipelines. Documents are processed and indexed in the background without blocking the UI.",
    tag: "Performance",
    children: [
      { label: "Async document pipeline", note: "Upload → extract → chunk → embed runs in background" },
      { label: "Polling status API",       note: "Real-time processing status with exponential backoff" },
      { label: "Cloud storage",            note: "Files stored on Cloudinary for scalable delivery" },
    ],
  },
];

const STEPS = [
  {
    num: "01",
    title: "Upload your content",
    desc: "Drop a PDF, paste a URL, upload an image, or type raw text. Extraction is handled automatically.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 4v10M7 8l4-4 4 4" stroke="#F7374F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 16v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" stroke="#F7374F" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: "02",
    title: "RAG pipeline runs",
    desc: "Text is extracted, split into chunks, embedded via LLM, and indexed in Pinecone — all automatically.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="#F7374F" strokeWidth="1.5"/>
        <path d="M8 11h6M11 8v6" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: "03",
    title: "Choose output type",
    desc: "Select TL;DR, bullets, key insights, action points, or section view — then generate in one click.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="6"  width="14" height="2" rx="1" fill="#F7374F"/>
        <rect x="4" y="10" width="10" height="2" rx="1" fill="#F7374F" opacity="0.55"/>
        <rect x="4" y="14" width="7"  height="2" rx="1" fill="#F7374F" opacity="0.28"/>
      </svg>
    ),
  },
  {
    num: "04",
    title: "Chat with your doc",
    desc: "Ask follow-up questions. RAG retrieves the most relevant chunks and answers with source precision.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z"
          stroke="#F7374F" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const TAG_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  "Input Layer":   { bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.2)",  color: "#818CF8" },
  "AI Core":       { bg: "rgba(247,55,79,0.08)",   border: "rgba(247,55,79,0.22)",  color: "#F7374F" },
  "Output Layer":  { bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)",  color: "#34D399" },
  "Interaction":   { bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",  color: "#FBB724" },
  "Security":      { bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.2)",  color: "#60A5FA" },
  "Performance":   { bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)", color: "#A78BFA" },
};

function TreeNode({ feature, index, visible, isLast }: {
  feature: typeof FEATURES[0]; index: number; visible: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tag = TAG_COLORS[feature.tag] ?? TAG_COLORS["AI Core"];

  return (
    <div style={{
      display: "flex",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 0.08}s,
                   transform 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 0.08}s`,
    }}>
      {/* spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "28px", flexShrink: 0 }}>
        {index > 0 && <div style={{ width: "1px", height: "24px", background: "rgba(247,55,79,0.12)", flexShrink: 0 }} />}
        <div style={{
          width: "8px", height: "8px", borderRadius: "2px", flexShrink: 0,
          marginTop: index === 0 ? "6px" : "0",
          background: open ? "#F7374F" : "rgba(247,55,79,0.25)",
          border: `1px solid ${open ? "#F7374F" : "rgba(247,55,79,0.35)"}`,
          transition: "background 0.2s, border-color 0.2s",
        }} />
        {!isLast && <div style={{ flex: 1, width: "1px", minHeight: "28px", background: "rgba(247,55,79,0.08)" }} />}
      </div>

      {/* content */}
      <div style={{ flex: 1, paddingLeft: "22px", paddingBottom: isLast ? 0 : "32px" }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            background: open ? "rgba(255,255,255,0.02)" : "none",
            border: open ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
            borderRadius: "12px",
            cursor: "pointer", padding: open ? "14px 16px" : "0",
            width: "100%", textAlign: "left",
            display: "flex", alignItems: "flex-start", gap: "14px",
            transition: "background 0.2s, border-color 0.2s, padding 0.25s",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span style={{
                fontSize: "14px", fontWeight: 700, letterSpacing: "-0.2px",
                color: open ? "#fff" : "rgba(255,255,255,0.78)",
                transition: "color 0.2s",
              }}>
                {feature.label}
              </span>
              <span style={{
                fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", padding: "2px 8px", borderRadius: "5px",
                background: tag.bg, border: `1px solid ${tag.border}`, color: tag.color,
              }}>
                {feature.tag}
              </span>
            </div>
            <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.28)", lineHeight: 1.75, margin: 0 }}>
              {feature.detail}
            </p>
          </div>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
            style={{
              flexShrink: 0, marginTop: "3px",
              color: open ? "#F7374F" : "rgba(247,55,79,0.4)",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), color 0.2s",
            }}
          >
            <path d="M4.5 2.5L8.5 6.5L4.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* children */}
        <div style={{
          overflow: "hidden",
          maxHeight: open ? `${feature.children.length * 44}px` : "0",
          transition: "max-height 0.38s cubic-bezier(0.22,1,0.36,1)",
        }}>
          <div style={{
            marginTop: "12px", paddingLeft: "16px",
            borderLeft: "1px solid rgba(247,55,79,0.1)",
            display: "flex", flexDirection: "column", gap: "10px",
            paddingBottom: "4px",
          }}>
            {feature.children.map((child, ci) => (
              <div key={ci} style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ width: "4px", height: "4px", borderRadius: "1px", background: "rgba(247,55,79,0.35)", flexShrink: 0, marginTop: "6px" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{child.label}</span>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>— {child.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutSection() {
  const leftAnim = useVisible(0.05);
  const treeAnim = useVisible(0.03);
  const hiw      = useVisible(0.06);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&display=swap');

        .snxa-steps-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
        }
        .snxa-step {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 26px 20px; display: flex; flex-direction: column;
          transition: border-color 0.25s ease, transform 0.25s ease;
        }
        .snxa-step:hover { border-color: rgba(247,55,79,0.3); transform: translateY(-3px); }
        .snxa-section { padding: 88px 40px; }

        .snxa-fade { opacity: 0; transform: translateY(18px); transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1); }
        .snxa-fade.vis { opacity: 1; transform: translateY(0); }
        .snxa-fade.d0 { transition-delay: 0s; }
        .snxa-fade.d1 { transition-delay: 0.1s; }
        .snxa-fade.d2 { transition-delay: 0.2s; }
        .snxa-fade.d3 { transition-delay: 0.32s; }
        .snxa-fade.d4 { transition-delay: 0.44s; }

        @media (max-width: 1024px) { .snxa-steps-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 680px) {
          .snxa-section { padding: 56px 18px !important; }
          .snxa-steps-grid { grid-template-columns: 1fr; gap: 12px; }
          .snxa-step { padding: 20px 16px; }
        }
        @media (max-width: 420px) { .snxa-section { padding: 44px 14px !important; } }
      `}</style>

      {/* ══ ABOUT ══ */}
      <section id="about" className="snxa-section" style={{
        background: "#000", borderTop: "1px solid rgba(255,255,255,0.06)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "900px", height: "480px",
          background: "radial-gradient(ellipse at top, rgba(247,55,79,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "780px", margin: "0 auto", position: "relative" }}>

          {/* ── Heading block — centered ── */}
          <div ref={leftAnim.ref} style={{ textAlign: "center", marginBottom: "56px" }}>

            <div className={`snxa-fade d0${leftAnim.vis ? " vis" : ""}`}
              style={{ display: "flex", justifyContent: "center" }}>
              <SectionLabel text="About SnipixAI" />
            </div>

            <h2 className={`snxa-fade d1${leftAnim.vis ? " vis" : ""}`} style={{
              fontFamily: "'Josefin Sans','Arial Black',sans-serif",
              fontSize: "clamp(26px, 3.8vw, 50px)",
              fontWeight: 700, color: "#fff",
              lineHeight: 1.08, letterSpacing: "-1px", marginBottom: "18px",
            }}>
              Built for people who{" "}
              <span style={{ color: "#F7374F" }}>value their time</span>
            </h2>

            <p className={`snxa-fade d2${leftAnim.vis ? " vis" : ""}`} style={{
              fontSize: "clamp(13px, 1.3vw, 15px)",
              color: "rgba(255,255,255,0.32)", lineHeight: 1.85,
              maxWidth: "520px", margin: "0 auto",
            }}>
              SnipixAI uses a RAG pipeline to extract, chunk, embed, and summarize
              your documents with state-of-the-art accuracy. Every answer is grounded
              in your actual content — no hallucinations.
            </p>

            {/* stats */}
            <div className={`snxa-fade d3${leftAnim.vis ? " vis" : ""}`} style={{
              display: "flex", justifyContent: "center", gap: "0",
              marginTop: "40px", paddingTop: "32px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              {[
                { val: "7",   unit: "Formats",  desc: "File types supported" },
                { val: "5",   unit: "Outputs",  desc: "Summary formats" },
                { val: "RAG", unit: "Powered",  desc: "Vector retrieval" },
              ].map((s, i, arr) => (
                <div key={s.unit} style={{
                  flex: 1, textAlign: "center",
                  borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  padding: "0 24px",
                }}>
                  <p style={{ fontSize: "28px", fontWeight: 700, color: "#F7374F", lineHeight: 1 }}>{s.val}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.unit}</p>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", marginTop: "3px" }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className={`snxa-fade d4${leftAnim.vis ? " vis" : ""}`} style={{
            width: "100%", height: "1px", marginBottom: "48px",
            background: "linear-gradient(90deg, transparent 0%, rgba(247,55,79,0.3) 40%, rgba(247,55,79,0.3) 60%, transparent 100%)",
          }} />

          {/* ── Feature tree ── */}
          <div ref={treeAnim.ref}>
            {FEATURES.map((f, i) => (
              <TreeNode key={f.id} feature={f} index={i} visible={treeAnim.vis} isLast={i === FEATURES.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how-it-works" className="snxa-section" style={{
        background: "#000", borderTop: "1px solid rgba(255,255,255,0.06)",
        position: "relative", overflow: "hidden", paddingBottom: "100px",
      }}>
        <div style={{
          position: "absolute", bottom: "-60px", left: "50%", transform: "translateX(-50%)",
          width: "700px", height: "360px",
          background: "radial-gradient(ellipse at bottom, rgba(247,55,79,0.04) 0%, transparent 68%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1160px", margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <SectionLabel text="How It Works" />
            <h2 style={{
              fontFamily: "'Josefin Sans','Arial Black',sans-serif",
              fontSize: "clamp(24px, 3.2vw, 44px)",
              fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-1px", marginBottom: "14px",
            }}>
              From upload to insight —{" "}
              <span style={{ color: "#F7374F" }}>in four steps</span>
            </h2>
            <p style={{ fontSize: "clamp(12px, 1.2vw, 14px)", color: "rgba(255,255,255,0.28)", lineHeight: 1.75 }}>
              No setup required. Works with any document format, any length.
            </p>
          </div>

          <div ref={hiw.ref} className="snxa-steps-grid">
            {STEPS.map((s, i) => (
              <div key={s.num} className="snxa-step" style={{
                opacity: hiw.vis ? 1 : 0,
                transform: hiw.vis ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s`,
              }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "rgba(247,55,79,0.42)", letterSpacing: "0.12em", display: "block", marginBottom: "18px" }}>
                  STEP {s.num}
                </span>
                <div style={{
                  width: "46px", height: "46px", borderRadius: "12px",
                  background: "rgba(247,55,79,0.07)", border: "1px solid rgba(247,55,79,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "20px", flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "10px", letterSpacing: "-0.3px", lineHeight: 1.3 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.28)", lineHeight: 1.75, flex: 1 }}>
                  {s.desc}
                </p>
                <div style={{
                  marginTop: "22px", height: "2px", borderRadius: "2px",
                  background: `linear-gradient(90deg, rgba(247,55,79,${0.65 - i * 0.12}) 0%, transparent 100%)`,
                }} />
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "44px", padding: "16px 28px", borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap",
          }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.16)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
              Powered by
            </span>
            {["RAG Pipeline", "LLM Embeddings", "Pinecone Vector DB", "LangChain", "FastAPI"].map((t, i, arr) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.38)" }}>{t}</span>
                {i < arr.length - 1 && <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "inline-block" }} />}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}