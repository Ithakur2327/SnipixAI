import { OutputType } from "@/types";

const OPTIONS: { id: OutputType; label: string; desc: string }[] = [
  { id: "tldr",            label: "TL;DR",         desc: "One paragraph overview" },
  { id: "bullets",         label: "Bullet summary", desc: "Key points as a list" },
  { id: "key_insights",    label: "Key insights",   desc: "Deep analytical findings" },
  { id: "action_points",   label: "Action points",  desc: "Tasks to act on" },
  { id: "section_summary", label: "Section view",   desc: "Section by section" },
];

interface Props {
  value: OutputType;
  onChange: (v: OutputType) => void;
}

export default function OutputTypeSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: "#888" }}>
        Output type
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button key={o.id} onClick={() => onChange(o.id)}
                  className="px-4 py-2 rounded-full border text-xs font-medium transition-all"
                  style={{
                    background:  value === o.id ? "#E8590A" : "white",
                    borderColor: value === o.id ? "#E8590A" : "#D0D0D0",
                    color:       value === o.id ? "white"   : "#555",
                  }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}