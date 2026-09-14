"use client";
import { useEffect, useRef, useState } from "react";
import { ClipboardCheck, Sparkles, SquareStack, UploadCloud } from "lucide-react";

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

const STATS = [
  { val: "6", unit: "File types", desc: "PDF, DOCX, PPT, URL, image & text" },
  { val: "5", unit: "Summary styles", desc: "TL;DR to a full breakdown" },
  { val: "2", unit: "Exam modes", desc: "Quiz or written test" },
];

const STEPS = [
  {
    num: "01",
    title: "Add your content",
    desc: "Drop a PDF, DOCX, PPT, or image, paste a link, or just type your text — however you have it.",
    icon: UploadCloud,
  },
  {
    num: "02",
    title: "We get it ready",
    desc: "However long or messy the source, it's read and understood in moments — no cleanup needed from you.",
    icon: Sparkles,
  },
  {
    num: "03",
    title: "Pick your summary",
    desc: "TL;DR, bullet points, key insights, action points, or a full section-by-section breakdown.",
    icon: SquareStack,
  },
  {
    num: "04",
    title: "Chat & test yourself",
    desc: "Ask follow-up questions grounded in your document, or generate a quiz or test to check what stuck.",
    icon: ClipboardCheck,
  },
];

export default function AboutSection() {
  const introAnim = useVisible(0.05);
  const stepsAnim = useVisible(0.06);

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

        @media (max-width: 1024px) { .snxa-steps-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 680px) {
          .snxa-section { padding: 56px 18px !important; }
          .snxa-steps-grid { grid-template-columns: 1fr; gap: 12px; }
          .snxa-step { padding: 20px 16px; }
        }
        @media (max-width: 420px) { .snxa-section { padding: 44px 14px !important; } }
      `}</style>

      <section id="about" className="snxa-section" style={{
        background: "#000", borderTop: "1px solid rgba(255,255,255,0.06)",
        position: "relative", overflow: "hidden", paddingBottom: "100px",
      }}>
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "900px", height: "480px",
          background: "radial-gradient(ellipse at top, rgba(247,55,79,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "1160px", margin: "0 auto", position: "relative" }}>

          <div ref={introAnim.ref} style={{ textAlign: "center", marginBottom: "60px" }}>
            <div className={`snxa-fade d0${introAnim.vis ? " vis" : ""}`}
              style={{ display: "flex", justifyContent: "center" }}>
              <SectionLabel text="About SnipixAI" />
            </div>

            <h2 className={`snxa-fade d1${introAnim.vis ? " vis" : ""}`} style={{
              fontFamily: "'Josefin Sans','Arial Black',sans-serif",
              fontSize: "clamp(26px, 3.8vw, 50px)",
              fontWeight: 700, color: "#fff",
              lineHeight: 1.08, letterSpacing: "-1px", marginBottom: "18px",
            }}>
              Built for people who{" "}
              <span style={{ color: "#F7374F" }}>value their time</span>
            </h2>

            <p className={`snxa-fade d2${introAnim.vis ? " vis" : ""}`} style={{
              fontSize: "clamp(13px, 1.3vw, 15px)",
              color: "rgba(255,255,255,0.32)", lineHeight: 1.85,
              maxWidth: "560px", margin: "0 auto",
            }}>
              Drop in a PDF, Word file, slide deck, image, or link — SnipixAI reads it and hands
              you the summary in the format you want, then sticks around to chat. Want to check
              what you've learned? Generate a quiz or test from the same document in one click.
            </p>

            <div className={`snxa-fade d3${introAnim.vis ? " vis" : ""}`} style={{
              display: "flex", justifyContent: "center", gap: "0",
              marginTop: "40px", paddingTop: "32px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              maxWidth: "560px", marginLeft: "auto", marginRight: "auto",
            }}>
              {STATS.map((s, i, arr) => (
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

          <div style={{
            width: "100%", height: "1px", marginBottom: "48px",
            background: "linear-gradient(90deg, transparent 0%, rgba(247,55,79,0.3) 40%, rgba(247,55,79,0.3) 60%, transparent 100%)",
          }} />

          <div ref={stepsAnim.ref} className="snxa-steps-grid">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.num} className="snxa-step" style={{
                  opacity: stepsAnim.vis ? 1 : 0,
                  transform: stepsAnim.vis ? "translateY(0)" : "translateY(24px)",
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
                    <Icon size={20} color="#F7374F" strokeWidth={1.7} />
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
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}