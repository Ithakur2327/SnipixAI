"use client";
import { MOCK_DOCUMENTS, MOCK_SUMMARY } from "@/lib/mockData";
import ChatInterface from "@/components/chat/ChatInterface";
import { MOCK_CHAT } from "@/lib/mockData";

export default function DocumentPage({ params }: { params: { id: string } }) {
  const doc = MOCK_DOCUMENTS.find((d) => d._id === params.id) ?? MOCK_DOCUMENTS[0];
  const summary = MOCK_SUMMARY;
  const bullets = Array.isArray(summary.content) ? summary.content : [summary.content];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
      {/* LEFT — Summary panel */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl p-6 border" style={{ background: "white", borderColor: "#E0E0E0" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-black text-lg leading-tight" style={{ color: "#1A1A1A" }}>
                {doc.title}
              </h2>
              <p className="text-xs mt-1" style={{ color: "#888" }}>
                {doc.wordCount.toLocaleString()} words · {doc.pageCount ?? "—"} pages · {doc.sourceType.toUpperCase()}
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: "#E1F5EE", color: "#085041" }}>
              Ready
            </span>
          </div>

          {/* Output type tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["TL;DR", "Bullets", "Key insights", "Action points"].map((t, i) => (
              <button key={t}
                      className="text-xs px-3 py-1.5 rounded-full border font-medium"
                      style={{
                        background:  i === 1 ? "#E8590A" : "white",
                        borderColor: i === 1 ? "#E8590A" : "#E0E0E0",
                        color:       i === 1 ? "white"   : "#555",
                      }}>
                {t}
              </button>
            ))}
          </div>

          {/* Summary content */}
          <div className="rounded-xl p-4" style={{ background: "#FAFAFA", border: "1px solid #F0F0F0" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#E8590A" }}>
              Bullet summary
            </p>
            <ul className="flex flex-col gap-2">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: "#333" }}>
                  <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: "#E8590A", marginTop: "7px" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* RIGHT — Chat */}
      <div style={{ height: "600px" }}>
        <ChatInterface documentId={params.id} />
      </div>
    </div>
  );
}