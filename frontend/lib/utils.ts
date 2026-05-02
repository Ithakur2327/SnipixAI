import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export function formatWords(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export const SOURCE_COLORS: Record<string, string> = {
  pdf:      "bg-orange-pale text-orange-dark border-orange/30",
  docx:     "bg-blue-50   text-blue-700   border-blue-200",
  ppt:      "bg-purple-50 text-purple-700 border-purple-200",
  url:      "bg-green-50  text-green-700  border-green-200",
  image:    "bg-pink-50   text-pink-700   border-pink-200",
  txt:      "bg-gray-100  text-gray-700   border-gray-200",
  raw_text: "bg-gray-100  text-gray-700   border-gray-200",
};