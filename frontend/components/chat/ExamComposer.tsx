"use client";
import { motion } from "framer-motion";
import { ListChecks, PenLine } from "lucide-react";
import type { ExamType } from "@/types";

export interface ExamFormValues {
  examType: ExamType;
  topic: string;
  useDocument: boolean;
  numQuestions: number;
  difficulty: "easy" | "medium" | "hard";
}

export default function ExamComposer({
  onGenerate,
  isGenerating,
}: {
  documentTitle: string;
  onGenerate: (values: ExamFormValues) => void;
  onClose: () => void;
  isGenerating: boolean;
}) {
  function pick(examType: ExamType) {
    if (isGenerating) return;
    onGenerate({ examType, topic: "", useDocument: true, numQuestions: 5, difficulty: "medium" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="flex w-full gap-2.5 rounded-2xl border border-white/10 bg-[#0C0C0C] p-3"
    >
      <button
        type="button"
        disabled={isGenerating}
        onClick={() => pick("quiz")}
        className="flex flex-1 items-center gap-2.5 rounded-xl border border-white/10 px-4 py-3 text-left transition-colors hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-40"
      >
        <ListChecks size={17} className="shrink-0 text-white/70" />
        <div>
          <p className="text-[13px] font-semibold text-white">Quiz</p>
          <p className="text-[11px] text-white/40">Multiple choice</p>
        </div>
      </button>
      <button
        type="button"
        disabled={isGenerating}
        onClick={() => pick("subjective")}
        className="flex flex-1 items-center gap-2.5 rounded-xl border border-white/10 px-4 py-3 text-left transition-colors hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-40"
      >
        <PenLine size={17} className="shrink-0 text-white/70" />
        <div>
          <p className="text-[13px] font-semibold text-white">Test</p>
          <p className="text-[11px] text-white/40">Written answers</p>
        </div>
      </button>
    </motion.div>
  );
}
