"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, PenLine, X } from "lucide-react";
import type { ExamType } from "@/types";

export interface ExamFormValues {
  examType: ExamType;
  topic: string;
  useDocument: boolean;
  numQuestions: number;
  difficulty: "easy" | "medium" | "hard";
}

export default function ExamComposer({
  documentTitle,
  onGenerate,
  onClose,
  isGenerating,
}: {
  documentTitle: string;
  onGenerate: (values: ExamFormValues) => void;
  onClose: () => void;
  isGenerating: boolean;
}) {
  const [examType, setExamType] = useState<ExamType>("quiz");
  const [useDocument, setUseDocument] = useState(true);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const canSubmit = useDocument || topic.trim().length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="w-full rounded-2xl border border-white/10 bg-[#0C0C0C] p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-[13px] font-semibold text-white flex items-center gap-1.5">
            <ListChecks size={15} className="text-white/70" />
            Generate an exam
          </p>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Close"
            type="button"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <button
            type="button"
            onClick={() => setExamType("quiz")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[12.5px] font-medium transition-colors ${
              examType === "quiz"
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            <ListChecks size={13} /> Quiz (MCQ)
          </button>
          <button
            type="button"
            onClick={() => setExamType("subjective")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[12.5px] font-medium transition-colors ${
              examType === "subjective"
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            <PenLine size={13} /> Subjective
          </button>
        </div>

        <div className="mb-3.5">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              role="switch"
              aria-checked={useDocument}
              onClick={() => setUseDocument((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${useDocument ? "bg-white/70" : "bg-white/15"}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-black transition-transform ${
                  useDocument ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-[12.5px] text-white/80">
              {useDocument ? `Based on "${documentTitle}"` : "Independent topic"}
            </span>
          </div>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={useDocument ? "Narrow the focus (optional)" : "e.g. Python basics, Trigonometry, World War II"}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-white/50">Questions</span>
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumQuestions(n)}
                  className={`px-2.5 py-1 text-[12px] transition-colors ${
                    numQuestions === n ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-white/50">Difficulty</span>
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`px-2.5 py-1 text-[12px] capitalize transition-colors ${
                    difficulty === d ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSubmit || isGenerating}
          onClick={() => onGenerate({ examType, topic: topic.trim(), useDocument, numQuestions, difficulty })}
          className="w-full rounded-xl bg-white text-black text-[13px] font-semibold py-2.5 transition-opacity disabled:opacity-30 hover:opacity-90"
        >
          {isGenerating ? "Generating exam..." : "Generate exam"}
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
