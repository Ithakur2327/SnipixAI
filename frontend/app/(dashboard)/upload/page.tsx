"use client";
import UploadDropzone from "@/components/upload/UploadDropzone";
import OutputTypeSelector from "@/components/upload/OutputTypeSelector";
import UrlInput from "@/components/upload/UrlInput";
import RawTextInput from "@/components/upload/RawTextInput";
import { useState } from "react";
import { OutputType, SourceType } from "@/types";

type UploadMethod = "file" | "url" | "text";

const METHODS: { id: UploadMethod; label: string; icon: string; desc: string }[] = [
  { id: "file", label: "File upload",  icon: "📁", desc: "PDF, DOCX, PPT, TXT, Image" },
  { id: "url",  label: "Web URL",      icon: "🌐", desc: "Any webpage or article" },
  { id: "text", label: "Raw text",     icon: "📝", desc: "Paste text directly" },
];

export default function UploadPage() {
  const [method, setMethod]       = useState<UploadMethod>("file");
  const [outputType, setOutputType] = useState<OutputType>("bullets");

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-black" style={{ color: "#1A1A1A" }}>New summary</h2>
        <p className="text-sm mt-1" style={{ color: "#888" }}>Choose your input method and output type</p>
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {METHODS.map((m) => (
          <button key={m.id} onClick={() => setMethod(m.id)}
                  className="rounded-xl p-4 text-left border-2 transition-all"
                  style={{
                    background:   method === m.id ? "#FFF3E0" : "white",
                    borderColor:  method === m.id ? "#E8590A" : "#E0E0E0",
                  }}>
            <span className="text-2xl">{m.icon}</span>
            <p className="text-xs font-bold mt-2" style={{ color: "#1A1A1A" }}>{m.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="mb-6">
        {method === "file" && <UploadDropzone />}
        {method === "url"  && <UrlInput />}
        {method === "text" && <RawTextInput />}
      </div>

      {/* Output type */}
      <OutputTypeSelector value={outputType} onChange={setOutputType} />

      {/* Submit */}
      <button className="btn-primary w-full py-3.5 rounded-xl text-base mt-6">
        Generate summary →
      </button>
    </div>
  );
}