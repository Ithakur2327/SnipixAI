"use client";
import { useEffect, useState } from "react";
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
      <div className="w-fit max-w-[min(85%,42rem)] rounded-2xl rounded-tr-md bg-white/10 px-4 py-2.5 text-[15px] leading-7 text-white whitespace-pre-wrap break-words font-apple sm:max-w-[85%]">
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
      className="flex gap-3.5"
    >
      <div
        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-shadow duration-500"
        style={streaming ? { boxShadow: "0 0 0 3px rgba(247,55,79,0.12), 0 0 16px rgba(247,55,79,0.35)" } : undefined}
      >
        <AiMark />
      </div>
      <div className="min-w-0 flex-1 text-[15px] font-apple">
        <MarkdownContent content={content} />
        {streaming && (
          <span
            className="snx-cursor ml-0.5 inline-block h-[16px] w-[3px] translate-y-[3px] rounded-sm"
            style={{ background: "linear-gradient(180deg, #FF6B1A, #F7374F)", boxShadow: "0 0 6px rgba(247,55,79,0.7)" }}
          />
        )}
      </div>
    </motion.div>
  );
}

// Cycled while waiting for the first token - same idea as the shimmering
// "Thinking…" label used elsewhere, swapped for a couple of phrases so it
// doesn't feel static on documents that take a few seconds to respond.
const THINKING_PHRASES = ["Reading the document", "Thinking", "Putting it together"];

export function TypingRow() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % THINKING_PHRASES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex gap-3.5">
      <div
        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white"
        style={{ boxShadow: "0 0 0 3px rgba(247,55,79,0.12), 0 0 16px rgba(247,55,79,0.35)" }}
      >
        <AiMark />
      </div>
      <div className="flex items-center pt-2.5">
        <span className="snx-shimmer text-[14px] font-medium">{THINKING_PHRASES[phraseIndex]}…</span>
      </div>
    </div>
  );
}