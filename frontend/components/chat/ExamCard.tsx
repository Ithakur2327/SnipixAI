"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, CircleCheck, CircleX, ListChecks, PenLine } from "lucide-react";
import { examAPI, getApiErrorMessage } from "@/lib/api";
import type { ChatMessage } from "@/types";
import MarkdownContent from "./MarkdownContent";

export default function ExamCard({
  message,
  onMessageUpdate,
}: {
  message: ChatMessage;
  onMessageUpdate: (updated: ChatMessage) => void;
}) {
  const exam = message.exam;
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, number>>(exam?.userAnswers ?? {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isQuiz = exam?.examType === "quiz";
  const submitted = exam?.submitted ?? false;
  const answers = submitted ? exam?.userAnswers ?? {} : pendingAnswers;

  const answeredCount = useMemo(() => Object.keys(pendingAnswers).length, [pendingAnswers]);

  if (!exam) return null;

  async function handleSelect(questionId: string, optionIndex: number) {
    if (submitted) return;
    setPendingAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await examAPI.submitQuiz(message.id, pendingAnswers);
      onMessageUpdate(res.data.data.message);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not submit your answers. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReveal(questionId: string, next: boolean) {
    setRevealingId(questionId);
    setErrorMsg(null);
    try {
      const res = await examAPI.revealAnswer(message.id, questionId, next);
      onMessageUpdate(res.data.data.message);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not load the answer. Please try again."));
    } finally {
      setRevealingId(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isQuiz ? <ListChecks size={16} className="text-white/70" /> : <PenLine size={16} className="text-white/70" />}
          <div>
            <p className="text-[13.5px] font-semibold text-white">{isQuiz ? "Quiz" : "Test"}</p>
            <p className="text-[12px] text-white/45">
              {exam.topic} · {exam.questions.length} question{exam.questions.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {isQuiz && submitted && exam.score && (
          <div className="rounded-full border border-white/15 px-3 py-1 text-[12.5px] font-semibold text-white">
            {exam.score.correct}/{exam.score.total} correct
          </div>
        )}
      </div>

      <div className="space-y-5">
        {exam.questions.map((q, idx) => {
          const selected = answers[q.id];
          const isRevealed = exam.revealed?.[q.id] ?? false;

          return (
            <div key={q.id} className={idx > 0 ? "pt-5 border-t border-white/[0.06]" : ""}>
              <p className="text-[13.5px] font-medium text-white mb-3 leading-6">
                <span className="text-white/40 mr-1.5">{idx + 1}.</span>
                {q.question}
              </p>

              {isQuiz && q.options && (
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = selected === optIdx;
                    const isCorrect = q.correctIndex === optIdx;
                    let stateClasses = "border-white/10 text-white/75 hover:border-white/25";
                    let icon: React.ReactNode = null;

                    if (submitted) {
                      if (isCorrect) {
                        stateClasses = "border-white/40 bg-white/10 text-white";
                        icon = <CircleCheck size={15} className="text-white shrink-0" />;
                      } else if (isSelected && !isCorrect) {
                        stateClasses = "border-white/20 bg-white/[0.03] text-white/50";
                        icon = <CircleX size={15} className="text-white/50 shrink-0" />;
                      } else {
                        stateClasses = "border-white/[0.06] text-white/35";
                      }
                    } else if (isSelected) {
                      stateClasses = "border-white/40 bg-white/10 text-white";
                      icon = <Check size={14} className="text-white shrink-0" />;
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() => handleSelect(q.id, optIdx)}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition-colors ${stateClasses} ${
                          submitted ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <span>{option}</span>
                        {icon}
                      </button>
                    );
                  })}
                </div>
              )}

              {isQuiz && submitted && q.explanation && (
                <p className="mt-2.5 text-[12.5px] leading-6 text-white/50">{q.explanation}</p>
              )}

              {!isQuiz && (
                <div>
                  <button
                    type="button"
                    onClick={() => handleReveal(q.id, !isRevealed)}
                    disabled={revealingId === q.id}
                    className="text-[12.5px] font-medium text-white/60 hover:text-white transition-colors underline decoration-white/20 disabled:opacity-40"
                  >
                    {revealingId === q.id ? "Loading..." : isRevealed ? "Hide" : "Answer"}
                  </button>
                  {isRevealed && q.answer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.2 }}
                      className="mt-2.5 rounded-xl border border-white/10 bg-black/40 px-4 py-3"
                    >
                      <MarkdownContent content={q.answer} />
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {errorMsg && <p className="mt-4 text-[12.5px] text-white/60">{errorMsg}</p>}

      {isQuiz && !submitted && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="mt-5 w-full rounded-xl bg-white text-black text-[13px] font-semibold py-2.5 transition-opacity disabled:opacity-40 hover:opacity-90"
        >
          {isSubmitting ? "Submitting..." : answeredCount < exam.questions.length ? `Submit (${answeredCount}/${exam.questions.length} answered)` : "Submit answers"}
        </button>
      )}
    </motion.div>
  );
}
