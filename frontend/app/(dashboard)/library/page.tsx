"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { documentAPI } from "@/lib/api";
import type { Document as DocItem } from "@/types";
import DocumentCard from "@/components/dashboard/DocumentCard";

const FILTERS = ["All", "PDF", "DOCX", "URL", "PPT"];

export default function LibraryPage() {
  const [filter, setFilter]   = useState("All");
  const [search, setSearch]   = useState("");
  const [docs, setDocs]       = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    documentAPI.list(1, 100)
      .then((res) => setDocs(res.data.data ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const totalDocs      = docs.length;
  const totalSummaries = docs.reduce((a, d) => a + (d.summaryCount ?? 0), 0);

  const filtered = docs.filter((d) => {
    const matchType =
      filter === "All" || d.sourceType.toLowerCase() === filter.toLowerCase();
    const matchSearch =
      search === "" ||
      d.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;600;700&display=swap');

        /* ── stagger animations ── */
        @keyframes lib-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .lib-anim { animation: lib-fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .lib-anim-1 { animation-delay: 0.04s; }
        .lib-anim-2 { animation-delay: 0.12s; }
        .lib-anim-3 { animation-delay: 0.20s; }
        .lib-anim-4 { animation-delay: 0.28s; }

        /* ── stat card hover ── */
        .lib-stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          padding: 24px 26px;
          transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }
        .lib-stat-card:hover {
          border-color: rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.05);
          transform: translateY(-2px);
        }

        /* ── CTA card ── */
        .lib-cta-card {
          background: linear-gradient(140deg, rgba(247,55,79,0.13) 0%, rgba(247,55,79,0.04) 100%);
          border: 1px solid rgba(247,55,79,0.22);
          border-radius: 18px;
          padding: 24px 26px;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .lib-cta-card:hover {
          background: linear-gradient(140deg, rgba(247,55,79,0.22) 0%, rgba(247,55,79,0.08) 100%);
          border-color: rgba(247,55,79,0.45);
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(247,55,79,0.14);
        }
        .lib-cta-card:active { transform: scale(0.98); }

        /* ── search input ── */
        .lib-search {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 11px;
          padding: 10px 14px 10px 40px;
          font-size: 13px;
          color: rgba(255,255,255,0.8);
          outline: none;
          width: 100%;
          font-family: var(--font-inter), sans-serif;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .lib-search::placeholder { color: rgba(255,255,255,0.25); }
        .lib-search:focus {
          border-color: rgba(247,55,79,0.45);
          background: rgba(255,255,255,0.06);
        }

        /* ── filter chip ── */
        .lib-chip {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          font-family: var(--font-inter), sans-serif;
          letter-spacing: 0.2px;
        }
        .lib-chip-inactive {
          background: transparent;
          color: rgba(255,255,255,0.35);
        }
        .lib-chip-inactive:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.75);
        }
        .lib-chip-active {
          background: rgba(247,55,79,0.88);
          color: #fff;
          font-weight: 600;
        }

        /* ── doc card entrance ── */
        @keyframes card-pop {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .lib-card-grid > * {
          animation: card-pop 0.4s cubic-bezier(0.22,1,0.36,1) both;
        }
        .lib-card-grid > *:nth-child(1) { animation-delay: 0.00s; }
        .lib-card-grid > *:nth-child(2) { animation-delay: 0.06s; }
        .lib-card-grid > *:nth-child(3) { animation-delay: 0.12s; }
        .lib-card-grid > *:nth-child(4) { animation-delay: 0.18s; }
        .lib-card-grid > *:nth-child(5) { animation-delay: 0.22s; }
        .lib-card-grid > *:nth-child(6) { animation-delay: 0.26s; }

        /* ── skeleton shimmer ── */
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.7; }
        }
        .lib-skeleton {
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>

      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "40px 24px 60px" }}>

        {/* ── PAGE HEADER ── */}
        <div className="lib-anim lib-anim-1" style={{ marginBottom: "36px" }}>
          <p style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#F7374F",
            marginBottom: "10px",
            opacity: 0.85,
          }}>
            Your Workspace
          </p>
          <h1 style={{
            fontFamily: "'Josefin Sans', 'Arial Black', sans-serif",
            fontSize: "clamp(32px, 4.5vw, 52px)",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "1.5px",
            lineHeight: 1.05,
            textTransform: "uppercase",
            marginBottom: "10px",
          }}>
            Document Library
          </h1>
          <p style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            color: "rgba(255,255,255,0.3)",
            lineHeight: 1.6,
          }}>
            All your summaries and documents, organized in one place.
          </p>
        </div>

        {/* ── TOP CARDS ROW ── */}
        <div
          className="lib-anim lib-anim-2"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.25fr",
            gap: "14px",
            marginBottom: "32px",
          }}
        >
          {/* Card 1 — Total Docs */}
          <div className="lib-stat-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <span style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
              }}>
                Total Docs
              </span>
              <div style={{
                width: "34px", height: "34px", borderRadius: "9px",
                background: "rgba(247,55,79,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M5 3h8l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
                    stroke="#F7374F" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M13 3v4h4" stroke="#F7374F" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M7 10h6M7 13h4" stroke="#F7374F" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div style={{
              fontFamily: "'Josefin Sans', 'Arial Black', sans-serif",
              fontSize: "48px",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1,
              letterSpacing: "1px",
              marginBottom: "8px",
            }}>
              {loading ? "—" : totalDocs}
            </div>
            <div style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              color: "#34D399",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 8V2M2 5l3-3 3 3" stroke="#34D399" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              +3 this week
            </div>
          </div>

          {/* Card 2 — Total Summaries */}
          <div className="lib-stat-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <span style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
              }}>
                Summarized
              </span>
              <div style={{
                width: "34px", height: "34px", borderRadius: "9px",
                background: "rgba(167,139,250,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="#A78BFA" strokeWidth="1.5"/>
                  <path d="M7 7h6M7 10h6M7 13h4" stroke="#A78BFA" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div style={{
              fontFamily: "'Josefin Sans', 'Arial Black', sans-serif",
              fontSize: "48px",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1,
              letterSpacing: "1px",
              marginBottom: "8px",
            }}>
              {loading ? "—" : totalSummaries}
            </div>
            <div style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              color: "#34D399",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 8V2M2 5l3-3 3 3" stroke="#34D399" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              +8 this week
            </div>
          </div>

          {/* Card 3 — New Summary CTA */}
          <div
            className="lib-cta-card"
            onClick={() => router.push("/upload")}
          >
            <div>
              <div style={{
                width: "42px", height: "42px", borderRadius: "12px",
                background: "#F7374F",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "16px",
                boxShadow: "0 0 24px rgba(247,55,79,0.45)",
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={{
                fontFamily: "'Josefin Sans', 'Arial Black', sans-serif",
                fontSize: "22px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "6px",
                lineHeight: 1.1,
              }}>
                New Summary
              </p>
              <p style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "12.5px",
                color: "rgba(255,255,255,0.38)",
                lineHeight: 1.6,
              }}>
                Upload a doc, paste a URL, or drop an image.
              </p>
            </div>
            <div style={{
              marginTop: "18px",
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "12px", fontWeight: 700,
              color: "#F7374F",
              fontFamily: "var(--font-inter), sans-serif",
              letterSpacing: "0.3px",
            }}>
              Start now
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M7.5 3.5l4 3.5-4 3.5" stroke="#F7374F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── DOCUMENTS SECTION ── */}
        <div
          className="lib-anim lib-anim-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          {/* Section toolbar */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1", minWidth: "180px", maxWidth: "300px" }}>
              <svg
                width="15" height="15" viewBox="0 0 20 20" fill="none"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <circle cx="8.5" cy="8.5" r="5.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.6"/>
                <path d="M13 13l3.5 3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input
                className="lib-search"
                type="text"
                placeholder="Search documents…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Filter chips */}
            <div style={{
              display: "flex",
              gap: "3px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "10px",
              padding: "3px",
            }}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`lib-chip ${filter === f ? "lib-chip-active" : "lib-chip-inactive"}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Section title row */}
          <div style={{
            padding: "16px 22px 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <h3 style={{
              fontFamily: "'Josefin Sans', 'Arial Black', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}>
              {filter === "All" ? "All Documents" : `${filter} Files`}
            </h3>
            <span style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              color: "rgba(255,255,255,0.2)",
            }}>
              {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`}
            </span>
          </div>

          {/* Cards grid */}
          <div
            className="lib-card-grid"
            style={{
              padding: "16px 20px 22px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "12px",
            }}
          >
            {loading ? (
              // Skeleton loading state
              [1, 2, 3].map((i) => (
                <div key={i} className="lib-skeleton" style={{ height: "160px" }} />
              ))
            ) : filtered.length > 0 ? (
              filtered.map((doc) => (
                <DocumentCard key={doc._id} doc={doc} />
              ))
            ) : (
              <div style={{
                gridColumn: "1 / -1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "56px 24px",
                gap: "12px",
              }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="17" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5"/>
                  <path d="M12 18h12M12 13h12M12 23h8" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.18)",
                  textAlign: "center",
                }}>
                  No documents match your search.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}