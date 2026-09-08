"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { documentAPI } from "@/lib/api";
import { DOCUMENT_TYPE_META, formatWords } from "@/lib/utils";
import type { Document as DocItem } from "@/types";
import DocumentChat from "@/components/chat/DocumentChat";

const FILTERS = ["All", "PDF", "DOCX", "URL", "PPT"];
const PAGE_SIZE = 10;

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function DocRow({ doc, onOpen, index }: { doc: DocItem; onOpen: () => void; index: number }) {
  const type = DOCUMENT_TYPE_META[doc.sourceType] ?? DOCUMENT_TYPE_META.txt;
  const isReady = doc.status === "ready";

  return (
    <>
      <style>{`
        .doc-row {
          display:grid;
          grid-template-columns: 32px 1fr auto auto auto;
          gap:0 14px;
          align-items:center;
          padding:13px 4px;
          border-bottom:1px solid rgba(255,255,255,0.05);
          cursor:${isReady ? "pointer" : "default"};
          transition:background 0.15s;
          animation: row-in 0.35s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay:${index * 0.04}s;
        }
        @keyframes row-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .doc-row:last-child { border-bottom:none; }
        .doc-row:hover { background:${isReady ? "rgba(255,255,255,0.025)" : "transparent"}; }
        .doc-row-open { opacity:0; transition:opacity 0.15s; font-size:11px; font-weight:600; color:#F7374F; display:flex; align-items:center; gap:4px; }
        .doc-row:hover .doc-row-open { opacity:${isReady ? "1" : "0"}; }
      `}</style>

      <div className="doc-row" onClick={() => isReady && onOpen()}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: type.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke={type.color} strokeWidth="1.3" />
            <path d="M10 1v4h4" stroke={type.color} strokeWidth="1.3" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>{doc.title}</p>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)" }}>
            {doc.wordCount && doc.wordCount > 0 ? `${formatWords(doc.wordCount)} words` : "Processing…"}
            {doc.pageCount ? ` · ${doc.pageCount}p` : ""}
            {doc.messageCount > 0 ? ` · ${doc.messageCount} message${doc.messageCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <span className="doc-type-badge" style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", background: type.bg, color: type.color, letterSpacing: "0.7px", flexShrink: 0, display: "none" }}>
          {type.label}
        </span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)", flexShrink: 0, whiteSpace: "nowrap" }}>
          {formatDate(doc.createdAt)}
        </span>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", minWidth: "72px", justifyContent: "flex-end" }}>
          {isReady ? (
            <span className="doc-row-open">
              Open
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6M5.5 2.5l3 2.5-3 2.5" stroke="#F7374F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : doc.status === "error" ? (
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "rgba(247,55,79,0.08)", color: "#F7374F" }}>Failed</span>
          ) : (
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "rgba(251,191,36,0.08)", color: "#FBB724" }}>Processing</span>
          )}
        </div>
      </div>
    </>
  );
}

export default function LibraryPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    documentAPI
      .list({ page: 1, limit: 100 })
      .then((res) => setDocs(res.data.data.documents ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const totalDocs = docs.length;
  const totalMessages = docs.reduce((a, d) => a + (d.messageCount ?? 0), 0);

  const filtered = docs.filter((d) => {
    const matchType = filter === "All" || d.sourceType.toLowerCase() === filter.toLowerCase();
    const matchSearch = search === "" || d.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const shown = filtered.slice(0, visible);

  return (
    <>
      {activeDocId && (
        <DocumentChat key={activeDocId} documentId={activeDocId} onClose={() => setActiveDocId(null)} variant="overlay" />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;700&display=swap');
        @keyframes lib-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .lib-up-1{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.04s both}
        .lib-up-2{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.12s both}
        .lib-up-3{animation:lib-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.20s both}

        .lib-search{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:8px 12px 8px 36px;font-size:13px;color:rgba(255,255,255,0.8);outline:none;transition:border-color 0.18s,background 0.18s;}
        .lib-search::placeholder{color:rgba(255,255,255,0.22);}
        .lib-search:focus{border-color:rgba(247,55,79,0.4);background:rgba(255,255,255,0.05);}

        .lib-chip{padding:5px 12px;border-radius:7px;border:none;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.12s,color 0.12s;}
        .lib-chip-off{background:transparent;color:rgba(255,255,255,0.28);}
        .lib-chip-off:hover{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);}
        .lib-chip-on{background:rgba(247,55,79,0.85);color:#fff;font-weight:600;}

        .lib-cta:hover{border-color:rgba(247,55,79,0.5)!important;background:linear-gradient(140deg,rgba(247,55,79,0.2) 0%,rgba(247,55,79,0.06) 100%)!important;transform:translateY(-2px);box-shadow:0 10px 36px rgba(247,55,79,0.12)!important;}
        .lib-cta:active{transform:scale(0.98)!important;}
        .lib-more:hover{background:rgba(255,255,255,0.06)!important;border-color:rgba(255,255,255,0.14)!important;color:rgba(255,255,255,0.75)!important;}

        @media(min-width:600px){ .doc-type-badge{display:inline!important;} }

        @media(max-width:540px){
          .doc-row{grid-template-columns:28px 1fr auto!important;gap:0 10px!important;}
          .doc-row>*:nth-child(4){display:none!important;}
          .lib-stat-grid{grid-template-columns:1fr 1fr!important;}
          .lib-stat-cta{grid-column:span 2!important;}
        }
      `}</style>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "clamp(22px,4vw,40px) clamp(14px,3vw,26px) 60px" }}>
        <div className="lib-up-1" style={{ marginBottom: "22px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#F7374F", opacity: 0.75, marginBottom: "6px" }}>
            Your Workspace
          </p>
          <h1 style={{ fontFamily: "'Josefin Sans','Arial Black',sans-serif", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 700, color: "#fff", letterSpacing: "1px", lineHeight: 1.05, textTransform: "uppercase", marginBottom: "5px" }}>
            Document Library
          </h1>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.26)", lineHeight: 1.6 }}>
            All your summaries and documents, organized in one place.
          </p>
        </div>

        <div className="lib-up-2 lib-stat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: "10px", marginBottom: "20px" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "clamp(12px,2vw,18px) clamp(12px,2vw,18px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>Docs</span>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(247,55,79,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M3 1h7l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke="#F7374F" strokeWidth="1.3" />
                  <path d="M10 1v4h4" stroke="#F7374F" strokeWidth="1.3" />
                </svg>
              </div>
            </div>
            <div style={{ fontFamily: "'Josefin Sans','Arial Black',sans-serif", fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {loading ? "—" : totalDocs}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "clamp(12px,2vw,18px) clamp(12px,2vw,18px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>Messages</span>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(167,139,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#A78BFA" strokeWidth="1.3" />
                  <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div style={{ fontFamily: "'Josefin Sans','Arial Black',sans-serif", fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {loading ? "—" : totalMessages}
            </div>
          </div>

          <div
            className="lib-cta lib-stat-cta"
            onClick={() => router.push("/")}
            style={{ background: "linear-gradient(140deg,rgba(247,55,79,0.09) 0%,rgba(247,55,79,0.02) 100%)", border: "1px solid rgba(247,55,79,0.18)", borderRadius: "12px", padding: "clamp(12px,2vw,18px) clamp(12px,2vw,18px)", cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "88px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#F7374F", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(247,55,79,0.38)", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: "'Josefin Sans','Arial Black',sans-serif", fontSize: "clamp(13px,1.8vw,16px)", fontWeight: 700, color: "#fff", letterSpacing: "0.5px", textTransform: "uppercase", lineHeight: 1.1 }}>New Summary</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", lineHeight: 1.5, marginTop: "3px" }}>Upload · URL · Text</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#F7374F", marginTop: "10px" }}>
              Start now
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6M5.5 2.5l3 2.5-3 2.5" stroke="#F7374F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className="lib-up-3">
          <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1", minWidth: "120px", maxWidth: "220px" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="5.5" cy="5.5" r="3.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.3" />
                <path d="M9 9l2.5 2.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                className="lib-search"
                style={{ width: "100%" }}
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisible(PAGE_SIZE);
                }}
              />
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: "2px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "2px" }}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`lib-chip ${filter === f ? "lib-chip-on" : "lib-chip-off"}`}
                  onClick={() => {
                    setFilter(f);
                    setVisible(PAGE_SIZE);
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "7px 4px 5px", display: "grid", gridTemplateColumns: "32px 1fr auto auto auto", gap: "0 14px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div />
            <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>Document</span>
            <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.15)" }}>Type</span>
            <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.15)", whiteSpace: "nowrap" }}>Added</span>
            <div style={{ minWidth: "72px" }} />
          </div>

          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ padding: "14px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ height: "12px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", width: `${50 + i * 12}%` }} />
                  <div style={{ height: "9px", borderRadius: "4px", background: "rgba(255,255,255,0.03)", width: "28%" }} />
                </div>
              </div>
            ))
          ) : shown.length > 0 ? (
            <>
              {shown.map((doc, i) => (
                <DocRow key={doc.id} doc={doc} index={i} onOpen={() => setActiveDocId(doc.id)} />
              ))}
              <div style={{ padding: "12px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.16)" }}>
                  {shown.length} of {filtered.length} document{filtered.length !== 1 ? "s" : ""}
                </span>
                {visible < filtered.length && (
                  <button
                    className="lib-more"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    style={{ padding: "6px 16px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.15s" }}
                  >
                    View {Math.min(PAGE_SIZE, filtered.length - visible)} more
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1.5v7M2 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "9px" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="rgba(255,255,255,0.05)" strokeWidth="1.4" />
                <path d="M9 14h10M9 10h10M9 18h6" stroke="rgba(255,255,255,0.08)" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.16)", textAlign: "center" }}>No documents match your filter.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
