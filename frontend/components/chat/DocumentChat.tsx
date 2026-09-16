"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ClipboardList, FileText, Home, Loader2, PenLine, Send, Square } from "lucide-react";
import { chatAPI, documentAPI, examAPI, getApiErrorMessage, streamChatMessage } from "@/lib/api";
import { DOCUMENT_TYPE_META, formatWords } from "@/lib/utils";
import type { ChatMessage, Document } from "@/types";
import { AssistantBubble, TypingRow, UserBubble } from "./ChatBubble";
import ExamCard from "./ExamCard";
import ExamComposer, { type ExamFormValues } from "./ExamComposer";

const AUTO_SUMMARY_PROMPT = "Summarize this document for me.";
// 500ms per attempt (was 1.2s) so the UI notices "ready" as close to the
// instant it actually happens as possible. Bumped the attempt count to
// match so the overall ~3 minute ceiling for very large 50MB uploads is
// unchanged.
const MAX_POLL_ATTEMPTS = 360;
const MIN_REVEAL_CHARS_PER_FRAME = 3;
// Groq streams tokens very fast, so the raw text can arrive in big bursts.
// Below this backlog we reveal at a fixed, steady "typewriter" pace so it
// always feels animated. Only once the backlog grows past this (a very
// long response arriving faster than we can type it out) do we speed up
// to catch up, so nothing ever lags for multiple seconds.
const CATCHUP_BACKLOG_THRESHOLD = 500;
const REVEAL_CATCHUP_DIVISOR = 25;

const subscribeNever = () => () => {};
function useHasMounted(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

function DocCard({ doc }: { doc: Document }) {
  const type = DOCUMENT_TYPE_META[doc.sourceType] ?? DOCUMENT_TYPE_META.txt;
  const isProcessing = doc.status === "processing";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: type.bg, color: type.color }}
      >
        <FileText size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-white">{doc.title}</p>
        <p className="text-[11.5px] text-white/40">
          {isProcessing
            ? "Reading your document…"
            : doc.status === "error"
            ? "Processing failed"
            : doc.wordCount
            ? `${formatWords(doc.wordCount)} words${doc.pageCount ? ` · ${doc.pageCount}p` : ""}`
            : "Ready"}
        </p>
      </div>
      {isProcessing && (
        <div className="flex shrink-0 gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white/40"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocErrorState({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
      <p className="text-[14px] font-medium text-white">This document couldn&apos;t be processed</p>
      <p className="max-w-md text-[12.5px] leading-6 text-white/45">{message}</p>
      <button
        onClick={onClose}
        className="mt-2 rounded-lg border border-white/15 px-4 py-2 text-[12.5px] text-white/70 hover:text-white hover:border-white/30 transition-colors"
      >
        Go back
      </button>
    </div>
  );
}

function ExamGeneratingState({ examType }: { examType: ExamFormValues["examType"] }) {
  const isQuiz = examType === "quiz";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-1 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white">
        {isQuiz ? <ClipboardList size={12} /> : <PenLine size={12} />}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="snx-shimmer text-[14px] font-medium">{isQuiz ? "Creating quiz" : "Creating test"}</span>
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-white/60"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}

export default function DocumentChat({
  documentId,
  onClose,
  variant = "overlay",
  enterAnimation = false,
}: {
  documentId: string;
  onClose: () => void;
  variant?: "overlay" | "page";
  enterAnimation?: boolean;
}) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [docLoadError, setDocLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [examComposerOpen, setExamComposerOpen] = useState(false);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [generatingExamType, setGeneratingExamType] = useState<ExamFormValues["examType"]>("quiz");
  const [examError, setExamError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [continuationRequested, setContinuationRequested] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const autoSummaryTriggeredRef = useRef(false);
  const pollAttemptsRef = useRef(0);
  const fullTextRef = useRef("");
  const continuationBaseRef = useRef("");
  const revealFrameRef = useRef<number | null>(null);

  const isMounted = useHasMounted();

  useEffect(() => {
    if (variant !== "overlay") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [variant]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await documentAPI.get(documentId);
        if (!cancelled) setDoc(res.data.data.document);
      } catch (err) {
        if (!cancelled) setDocLoadError(getApiErrorMessage(err, "This document could not be loaded."));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    if (!doc || doc.status !== "processing") return;
    const interval = setInterval(async () => {
      pollAttemptsRef.current += 1;
      try {
        const res = await documentAPI.getStatus(documentId);
        setDoc((prev) => (prev ? { ...prev, status: res.data.data.status as Document["status"], errorMessage: res.data.data.errorMessage } : prev));
      } catch {
      }
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        clearInterval(interval);
        setDoc((prev) => (prev ? { ...prev, status: "error", errorMessage: "This is taking longer than expected. Please try again." } : prev));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [doc, documentId]);

  useEffect(() => {
    if (doc?.status !== "ready" || historyLoaded) return;
    let cancelled = false;
    async function loadHistory() {
      try {
        const res = await chatAPI.getHistory(documentId);
        if (!cancelled) {
          setMessages(res.data.data.messages);
          setHistoryLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setChatError(getApiErrorMessage(err, "Could not load conversation history."));
          setHistoryLoaded(true);
        }
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [doc?.status, documentId, historyLoaded]);

  const stopRevealLoop = useCallback(() => {
    if (revealFrameRef.current !== null) {
      cancelAnimationFrame(revealFrameRef.current);
      revealFrameRef.current = null;
    }
  }, []);

  const startRevealLoop = useCallback(() => {
    stopRevealLoop();
    const tick = () => {
      setStreamingContent((prev) => {
        const full = fullTextRef.current;
        if (prev.length >= full.length) return prev;
        const backlog = full.length - prev.length;
        const step =
          backlog > CATCHUP_BACKLOG_THRESHOLD
            ? Math.ceil(backlog / REVEAL_CATCHUP_DIVISOR)
            : // Small random jitter (2-4 chars/frame, same ~3 char average as
              // before) instead of a perfectly constant tick - reads as a
              // person typing rather than a metronome, without changing the
              // overall speed.
              MIN_REVEAL_CHARS_PER_FRAME + (Math.floor(Math.random() * 3) - 1);
        return full.slice(0, prev.length + Math.max(1, step));
      });
      revealFrameRef.current = requestAnimationFrame(tick);
    };
    revealFrameRef.current = requestAnimationFrame(tick);
  }, [stopRevealLoop]);

  useEffect(() => stopRevealLoop, [stopRevealLoop]);

  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleSend = useCallback(
    async (text: string, continuation = false) => {
      const trimmed = text.trim();
      if ((!trimmed && !continuation) || isStreaming || doc?.status !== "ready") return;

      setChatError(null);
      if (!continuation) {
        setInput("");
        requestAnimationFrame(autoResizeTextarea);
        continuationBaseRef.current = "";
      } else {
        const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.type === "text");
        continuationBaseRef.current = lastAssistant?.content ?? "";
        setMessages((prev) => {
          const lastIndex = [...prev].map((message) => message.role === "assistant" && message.type === "text").lastIndexOf(true);
          return lastIndex >= 0 ? prev.filter((_, index) => index !== lastIndex) : prev;
        });
      }

      const userMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        documentId,
        role: "user",
        type: "text",
        content: trimmed,
        sources: [],
        exam: null,
        createdAt: new Date().toISOString(),
      };
      if (!continuation) setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      fullTextRef.current = "";
      setStreamingContent("");
      startRevealLoop();

      const controller = new AbortController();
      abortRef.current = controller;
      let finalized = false;

      try {
        await streamChatMessage(documentId, trimmed, {
          signal: controller.signal,
          continuation,
          skipRetrieval: !continuation && trimmed === AUTO_SUMMARY_PROMPT,
          onEvent: (event) => {
            if (event.type === "token") {
              fullTextRef.current += event.content;
            } else if (event.type === "error") {
              setChatError(event.message);
            } else if (event.type === "done") {
              finalized = true;
              stopRevealLoop();
              setMessages((prev) => [
                ...prev,
                {
                  id: event.messageId,
                  documentId,
                  role: "assistant",
                  type: "text",
                  content: continuationBaseRef.current + fullTextRef.current,
                  sources: event.sources,
                  exam: null,
                  createdAt: event.createdAt,
                },
              ]);
              setStreamingContent("");
              if (!event.complete) setContinuationRequested(true);
            }
          },
        });
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setChatError(getApiErrorMessage(err, "Something went wrong while generating a response."));
        }
      } finally {
        stopRevealLoop();
        if (!finalized && fullTextRef.current.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: `local-${Date.now()}`,
              documentId,
              role: "assistant",
              type: "text",
              content: continuationBaseRef.current + fullTextRef.current,
              sources: [],
              exam: null,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
        setStreamingContent("");
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [documentId, isStreaming, doc?.status, autoResizeTextarea, startRevealLoop, stopRevealLoop, messages]
  );

  useEffect(() => {
    if (doc?.status === "ready" && historyLoaded && messages.length === 0 && !autoSummaryTriggeredRef.current) {
      autoSummaryTriggeredRef.current = true;
      void handleSend(AUTO_SUMMARY_PROMPT);
    }
  }, [doc?.status, historyLoaded, messages.length, handleSend]);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    bottomRef.current?.scrollIntoView({ behavior });
  }

  useEffect(() => {
    if (isNearBottomRef.current) scrollToBottom(historyLoaded ? "smooth" : "auto");
  }, [messages, streamingContent, historyLoaded]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleMessageUpdate(updated: ChatMessage) {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  async function handleGenerateExam(values: ExamFormValues) {
    setGeneratingExamType(values.examType);
    setIsGeneratingExam(true);
    setExamError(null);
    setExamComposerOpen(false);
    isNearBottomRef.current = true;
    try {
      const res = await examAPI.generate(documentId, values);
      setMessages((prev) => [...prev, res.data.data.message]);
    } catch (err) {
      setExamError(getApiErrorMessage(err, "Could not generate the exam. Please try again."));
    } finally {
      setIsGeneratingExam(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(input);
    }
  }

  const showThread = !docLoadError && doc && doc.status !== "error";
  const isReady = doc?.status === "ready";
  const isProcessing = doc?.status === "processing";

  const containerClass =
    variant === "overlay"
      ? "fixed inset-0 flex flex-col bg-black"
      : "relative flex min-h-dvh flex-col bg-black";

  const content = (
    <motion.div
      className={containerClass}
      style={variant === "overlay" ? { zIndex: 1000000 } : undefined}
      initial={enterAnimation ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={enterAnimation ? { opacity: 0 } : undefined}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex items-center gap-1.5 sm:right-6 sm:gap-2">
        <style>{`
          @keyframes examBorderFlow {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
          .snx-exam-btn {
            position: relative;
            isolation: isolate;
            box-shadow: 0 5px 14px rgba(247, 55, 79, 0.16), inset 0 1px 0 rgba(255,255,255,0.12);
            transform: translateY(0);
            transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
          }
          .snx-exam-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(247, 55, 79, 0.28), inset 0 1px 0 rgba(255,255,255,0.16);
          }
          .snx-exam-btn::before {
            content: '';
            position: absolute;
            inset: -1.5px;
            border-radius: 0.5rem;
            padding: 1.5px;
            background: linear-gradient(90deg, #F7374F, #FF6B1A, #F7374F, #FF6B1A, #F7374F);
            background-size: 200% 100%;
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            animation: examBorderFlow 2.2s linear infinite;
            z-index: -1;
          }
        `}</style>
        {isReady && (
          <button
            type="button"
            onClick={() => setExamComposerOpen((v) => !v)}
            title="Generate an exam"
            aria-label="Generate exam"
            className="snx-exam-btn flex h-9 w-14 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-black/80 px-2 backdrop-blur transition-colors hover:bg-white/10"
            style={examComposerOpen ? { color: "#F7374F" } : { color: "rgba(255,255,255,0.85)" }}
          >
            <ClipboardList size={12} />
            <span className="text-[10px] font-semibold">Exam</span>
          </button>
        )}
        <Link
          href="/"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-white/70 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Home"
          title="Home"
          style={{ boxShadow: "0 5px 14px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.12)" }}
        >
          <Home size={16} />
        </Link>
      </div>

      <style>{`
        .snx-chat-scroll {
          overflow-y: scroll;
          scrollbar-gutter: stable;
          scrollbar-color: rgba(255,255,255,0.28) #050505;
          scrollbar-width: auto;
        }
        .snx-chat-scroll::-webkit-scrollbar { width: 10px; }
        .snx-chat-scroll::-webkit-scrollbar-track { background: #050505; }
        .snx-chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.28);
          border: 3px solid #050505;
          border-radius: 999px;
        }
        .snx-chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.48); }
      `}</style>
      <div ref={scrollRef} onScroll={handleScroll} className="snx-chat-scroll relative flex-1">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-14 sm:gap-6 sm:px-8">
          {docLoadError && <DocErrorState message={docLoadError} onClose={onClose} />}
          {!docLoadError && doc?.status === "error" && (
            <DocErrorState message={doc.errorMessage || "Something went wrong while processing this document."} onClose={onClose} />
          )}

          {showThread && doc && <DocCard doc={doc} />}

          {showThread && doc?.status === "ready" && !historyLoaded && (
            <div className="flex justify-center py-10">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-white/30"
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </div>
          )}

          {showThread &&
            doc?.status === "ready" &&
            historyLoaded &&
            messages.map((message) =>
              message.type === "exam" ? (
                <ExamCard key={message.id} message={message} onMessageUpdate={handleMessageUpdate} />
              ) : message.role === "user" ? (
                <UserBubble key={message.id} content={message.content ?? ""} />
              ) : (
                <AssistantBubble key={message.id} content={message.content ?? ""} />
              )
            )}

          {isStreaming && (streamingContent ? <AssistantBubble content={continuationBaseRef.current + streamingContent} streaming /> : <TypingRow />)}

          <div ref={bottomRef} />
        </div>

        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              onClick={() => {
                isNearBottomRef.current = true;
                scrollToBottom();
              }}
              className="absolute bottom-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-black/90 text-white/70 shadow-lg backdrop-blur hover:text-white"
              aria-label="Scroll to latest"
            >
              <ChevronDown size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {showThread && (
        <div className="border-t border-white/10 bg-black px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <div className="mx-auto w-full max-w-[900px] px-0">
            <AnimatePresence>
              {examComposerOpen && isReady && doc && (
                <div className="mb-3">
                  <ExamComposer
                    documentTitle={doc.title}
                    onGenerate={handleGenerateExam}
                    onClose={() => setExamComposerOpen(false)}
                    isGenerating={isGeneratingExam}
                  />
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isGeneratingExam && <ExamGeneratingState examType={generatingExamType} />}
            </AnimatePresence>

            {examError && <p className="mb-2 text-[12px] text-white/50">{examError}</p>}
            {chatError && <p className="mb-2 text-[12px] text-white/50">{chatError}</p>}
            {continuationRequested && !isStreaming && (
              <button
                type="button"
                onClick={() => {
                  setContinuationRequested(false);
                  void handleSend("", true);
                }}
                className="mb-2 text-left text-[12px] text-white/65 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
              >
                Continue response
              </button>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-3.5 py-2 transition-colors focus-within:border-white/30">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                disabled={isStreaming || !isReady}
                rows={1}
                placeholder={isProcessing ? "Preparing your document…" : "Message SnipixAI…"}
                className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-white placeholder:text-white/30 outline-none disabled:opacity-50"
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity hover:opacity-85"
                  aria-label="Stop generating"
                >
                  <Square size={13} fill="black" />
                </button>
              ) : isProcessing ? (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/40"
                  aria-label="Preparing document"
                  title="Preparing your document…"
                >
                  <Loader2 size={14} className="animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSend(input)}
                  disabled={!input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity disabled:opacity-20 hover:opacity-85"
                  aria-label="Send message"
                >
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  if (variant === "overlay") {
    if (!isMounted) return null;
    return createPortal(content, document.body);
  }

  return content;
}
