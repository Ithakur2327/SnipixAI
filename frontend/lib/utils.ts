import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWords(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export interface DocumentTypeMeta {
  label: string;
  color: string;
  bg: string;
}

export const DOCUMENT_TYPE_META: Record<string, DocumentTypeMeta> = {
  pdf: { label: "PDF", color: "#F7374F", bg: "rgba(247,55,79,0.12)" },
  docx: { label: "DOC", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  ppt: { label: "PPT", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  url: { label: "URL", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  image: { label: "IMG", color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  txt: { label: "TXT", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  raw_text: { label: "TXT", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
};