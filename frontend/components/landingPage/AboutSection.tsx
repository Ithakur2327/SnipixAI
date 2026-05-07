"use client";

const FEATURES = [
  { icon: "📄", title: "7 Formats",     desc: "PDF, DOCX, PPT, TXT, URL, Image, Plain Text",         accent: "#E8590A" },
  { icon: "🧠", title: "RAG Chat",      desc: "Ask questions, get cited answers from your docs",       accent: "#60A5FA" },
  { icon: "⚡", title: "2s Response",   desc: "Fast AI pipeline with real-time streaming output",      accent: "#34D399" },
  { icon: "🔒", title: "100% Private",  desc: "Per-user isolation — your data never leaks",            accent: "#A78BFA" },
];

const BULLETS = [
  { title: "Powered by GPT-4o + LangChain",        desc: "State-of-the-art summarization with chain-of-thought reasoning" },
  { title: "Pinecone vector DB for semantic search", desc: "Find relevant chunks from thousands of pages in milliseconds" },
  { title: "Supports 7 file formats including OCR",  desc: "From scanned images to complex PowerPoint decks" },
  { title: "Per-user document isolation & security", desc: "Your vectors and data are namespaced and protected" },
];

const STEPS = [
  {
    num: "01",
    title: "Upload your content",
    desc: "Drop a PDF, paste a URL, upload an image, or type raw text. We handle extraction automatically.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v9M6 7l4-4 4 4" stroke="#E8590A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="#E8590A" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: "02",
    title: "Choose output type",
    desc: "Pick from TL;DR, bullet points, key insights, action points, or section-by-section view.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="5" width="14" height="2" rx="1" fill="#E8590A"/>
        <rect x="3" y="9" width="10" height="2" rx="1" fill="#E8590A" opacity="0.6"/>
        <rect x="3" y="13" width="7" height="2" rx="1" fill="#E8590A" opacity="0.35"/>
      </svg>
    ),
  },
  {
    num: "03",
    title: "Get AI summary",
    desc: "LangChain + GPT-4o processes your content and returns clean, structured output in seconds.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#E8590A" strokeWidth="1.6"/>
        <path d="M7.5 10.5l2 2 3-4" stroke="#E8590A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    num: "04",
    title: "Chat with your doc",
    desc: "Ask follow-up questions. RAG retrieves the most relevant chunks to answer with precision.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H7l-3 3V5a1 1 0 011-1z" stroke="#E8590A" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

function Pill({ label }: { label: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      background: "rgba(232,89,10,0.08)", border: "1px solid rgba(232,89,10,0.18)",
      borderRadius: "100px", padding: "5px 14px",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8590A", display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: "11px", color: "#E8590A", fontWeight: 700, letterSpacing: "0.08em" }}>{label}</span>
    </div>
  );
}

export default function AboutSection() {
  return (
    <>
      <style>{`
        @keyframes snxFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes snxScaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        
        .snx-about-section {
          animation: snxFadeUp 0.64s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        
        .snx-about-pill {
          animation: snxFadeUp 0.56s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
        }
        
        .snx-about-heading {
          animation: snxFadeUp 0.64s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }
        
        .snx-about-desc {
          animation: snxFadeUp 0.64s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
        }
        
        .snx-feature-card {
          animation: snxScaleIn 0.56s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
          transition: all 0.36s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .snx-feature-card:nth-child(1) { animation-delay: 0.4s; }
        .snx-feature-card:nth-child(2) { animation-delay: 0.45s; }
        .snx-feature-card:nth-child(3) { animation-delay: 0.5s; }
        .snx-feature-card:nth-child(4) { animation-delay: 0.55s; }
        
        .snx-feature-card:hover {
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(232, 89, 10, 0.5) !important;
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        }
      `}</style>
      {/* ══════════════ ABOUT ══════════════ */}
      <section
        id="about"
        className="snx-about-section"
        style={{
          padding: "72px 32px",
          background: "#000000",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
          width: "700px", height: "400px",
          background: "radial-gradient(ellipse at center, rgba(232,89,10,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1160px", margin: "0 auto", position: "relative" }}>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <div className="snx-about-pill">
              <Pill label="ABOUT SNIPIXAI" />
            </div>
          </div>

          <h2 
  className="snx-about-heading"
  style={{
    fontFamily: "'Josefin Sans', 'Arial Black', sans-serif", // 👈 same as hero
    fontSize: "clamp(32px, 4vw, 52px)",
    fontWeight: 900,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 1.12,
    letterSpacing: "-1.5px",
    marginBottom: "18px",
  }}
>
  Built for people who{" "}
  <span style={{ color: "#E8590A" }}>value their time</span>
</h2>

          <p 
            className="snx-about-desc"
            style={{
            fontSize: "15px", color: "rgba(255,255,255,0.4)", lineHeight: 1.85,
            textAlign: "center", maxWidth: "560px", margin: "0 auto 40px",
          }}
          >
            SnipixAI uses a RAG pipeline to extract, chunk, embed, and summarize your documents
            with state-of-the-art accuracy. Every answer is grounded in your actual content — no hallucinations.
          </p>

          {/* Two-col */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "stretch" }}>

            {/* Left — feature cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", gridAutoRows: "1fr" }}>
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="snx-feature-card"
                  style={{
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px", padding: "22px 20px", cursor: "default",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "10px",
                    background: `${f.accent}12`, border: `1px solid ${f.accent}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px", marginBottom: "14px",
                  }}>
                    {f.icon}
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF", marginBottom: "6px", letterSpacing: "-0.2px" }}>
                    {f.title}
                  </p>
                  <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.32)", lineHeight: 1.65 }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Right — tech badges + bullets */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "20px", padding: "36px 32px",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
                {["GPT-4o", "LangChain", "Pinecone", "OCR", "Cloudinary"].map((tech) => (
                  <span key={tech} style={{
                    fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.5)",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "6px", padding: "4px 10px", letterSpacing: "0.04em",
                  }}>
                    {tech}
                  </span>
                ))}
              </div>

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", marginBottom: "28px" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {BULLETS.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{
                      width: "22px", height: "22px", borderRadius: "6px",
                      background: "rgba(232,89,10,0.12)", border: "1px solid rgba(232,89,10,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: "1px",
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 2" stroke="#E8590A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: "3px", letterSpacing: "-0.2px" }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section
        id="how-it-works"
        style={{
          padding: "72px 32px 80px",
          background: "#000000",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", bottom: "-80px", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "300px",
          background: "radial-gradient(ellipse, rgba(232,89,10,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative" }}>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
            <Pill label="HOW IT WORKS" />
          </div>

          <h2 style={{
  fontFamily: "'Josefin Sans', 'Arial Black', sans-serif", 
  fontSize: "clamp(30px, 3.5vw, 46px)",
  fontWeight: 900,
  color: "#FFFFFF",
  textAlign: "center",
  letterSpacing: "-1.5px",
  lineHeight: 1.12,
  marginBottom: "14px",
}}>
  From upload to insight —{" "}
  <span style={{ color: "#E8590A" }}>in four steps</span>
</h2>

          <p style={{
            fontSize: "14px", color: "rgba(255,255,255,0.35)",
            textAlign: "center", marginBottom: "48px", lineHeight: 1.7,
          }}>
            No setup required. Works with any document format, any length.
          </p>

          {/* Steps row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ padding: "0 20px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>

                {/* Connector line: icon right-edge → next icon left-edge (centered layout) */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: "absolute",
                    top: "26px",       // half of 52px icon
                    left: "calc(50% + 26px)",   // center of this col + half icon width
                    right: "calc(-50% + 26px)",  // center of next col - half icon width
                    height: "1px",
                    background: "linear-gradient(90deg, rgba(232,89,10,0.35) 0%, rgba(232,89,10,0.1) 100%)",
                    zIndex: 0,
                  }} />
                )}

                {/* Icon */}
                <div style={{
                  width: "52px", height: "52px", borderRadius: "14px",
                  background: "#000000", border: "1px solid rgba(232,89,10,0.28)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "22px", position: "relative", zIndex: 1,
                  boxShadow: "0 0 0 6px rgba(0,0,0,0.15)",
                }}>
                  {s.icon}
                </div>

                <span style={{
                  fontSize: "10.5px", fontWeight: 800, color: "rgba(232,89,10,0.5)",
                  letterSpacing: "0.1em", display: "block", marginBottom: "8px",
                }}>
                  STEP {s.num}
                </span>

                <h3 style={{
                  fontSize: "14px", fontWeight: 700, color: "#FFFFFF",
                  marginBottom: "10px", letterSpacing: "-0.3px", lineHeight: 1.3,
                }}>
                  {s.title}
                </h3>

                <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.33)", lineHeight: 1.75 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}