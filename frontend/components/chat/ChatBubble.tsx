"use client";
import { motion } from "framer-motion";
import MarkdownContent from "./MarkdownContent";

function AiMark({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <path d="M1.5 2.5h9M1.5 6h6.5M1.5 9.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function UserBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-white/10 px-4 py-2.5 text-[14px] leading-6 text-white whitespace-pre-wrap break-words">
        {content}
      </div>
    </motion.div>
  );
}

export function AssistantBubble({ content, streaming = false }: { content: string; streaming?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex gap-3"
    >
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70">
        <AiMark />
      </div>
      <div className="min-w-0 flex-1 text-[14px]">
        <MarkdownContent content={content} />
        {streaming && (
          <span className="ml-0.5 inline-block h-[15px] w-[2px] translate-y-[3px] animate-pulse bg-white/70" />
        )}
      </div>
    </motion.div>
  );
}

export function TypingRow() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70">
        <AiMark />
      </div>
      <div className="flex items-center gap-1.5 pt-2.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/40"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}
