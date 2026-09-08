"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, GraduationCap, Send, Square, X } from "lucide-react";
import { chatAPI, documentAPI, examAPI, getApiErrorMessage, streamChatMessage } from "@/lib/api";
import { DOCUMENT_TYPE_META, formatWords } from "@/lib/utils";
import type { ChatMessage, Document } from "@/types";
import { AssistantBubble, TypingRow, UserBubble } from "./ChatBubble";
import ExamCard from "./ExamCard";
import ExamComposer, { type ExamFormValues } from "./ExamComposer";

const AUTO_SUMMARY_PROMPT = "Summarize this document for me.";
const MAX_POLL_ATTEMPTS = 90;

const subscribeNever = () => () => {};
function useHasMounted(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

function StatusSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-white/40"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>
      <p className="text-[13px] text-white/45">{label}</p>
    </div>
  );
}

function DocErrorState({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
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

export default function DocumentChat({
  documentId,
  onClose,
  variant = "overlay",
}: {
  documentId: string;
  onClose: () => void;
  variant?: "overlay" | "page";
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
  const [examError, setExamError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const autoSummaryTriggeredRef = useRef(false);
  const pollAttemptsRef = useRef(0);

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
    }, 2000);
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

  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || doc?.status !== "ready") return;

      setChatError(null);
      setInput("");
      requestAnimationFrame(autoResizeTextarea);

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
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent("");

      let accumulated = "";
      const controller = new AbortController();
      abortRef.current = controller;
      let finalized = false;

      try {
        await streamChatMessage(documentId, trimmed, {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "token") {
              accumulated += event.content;
              setStreamingContent(accumulated);
            } else if (event.type === "error") {
              setChatError(event.message);
            } else if (event.type === "done") {
              finalized = true;
              setMessages((prev) => [
                ...prev,
                {
                  id: event.messageId,
                  documentId,
                  role: "assistant",
                  type: "text",
                  content: accumulated,
                  sources: event.sources,
                  exam: null,
                  createdAt: event.createdAt,
                },
              ]);
              setStreamingContent("");
            }
          },
        });
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setChatError(getApiErrorMessage(err, "Something went wrong while generating a response."));
        }
      } finally {
        if (!finalized && accumulated.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: `local-${Date.now()}`,
              documentId,
              role: "assistant",
              type: "text",
              content: accumulated,
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
    [documentId, isStreaming, doc?.status, autoResizeTextarea]
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
    setIsGeneratingExam(true);
    setExamError(null);
    try {
      const res = await examAPI.generate(documentId, values);
      setMessages((prev) => [...prev, res.data.data.message]);
      setExamComposerOpen(false);
      isNearBottomRef.current = true;
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

  const typeMeta = doc ? DOCUMENT_TYPE_META[doc.sourceType] ?? DOCUMENT_TYPE_META.txt : null;

  const statusLabel = useMemo(() => {
    if (!doc) return "";
    if (doc.status === "processing") return "Processing your document…";
    if (doc.status === "error") return "Processing failed";
    if (doc.wordCount) return `${formatWords(doc.wordCount)} words`;
    return "Ready";
  }, [doc]);

  const containerClass =
    variant === "overlay"
      ? "fixed inset-0 flex flex-col bg-black"
      : "flex min-h-screen flex-col bg-black";

  const content = (
    <div className={containerClass} style={variant === "overlay" ? { zIndex: 1000000 } : undefined}>
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur">
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          {variant === "overlay" ? <X size={17} /> : <ArrowLeft size={17} />}
        </button>
        {typeMeta && (
          <span
            className="shrink-0 rounded-md px-2 py-1 text-[10.5px] font-bold tracking-wide"
            style={{ color: typeMeta.color, background: typeMeta.bg }}
          >
            {typeMeta.label}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-white">{doc?.title ?? "Loading…"}</p>
          <p className="truncate text-[11px] text-white/40">{statusLabel}</p>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-6 sm:px-6">
          {docLoadError && <DocErrorState message={docLoadError} onClose={onClose} />}

          {!docLoadError && doc?.status === "processing" && <StatusSkeleton label="Reading and understanding your document…" />}
          {!docLoadError && doc?.status === "error" && (
            <DocErrorState message={doc.errorMessage || "Something went wrong while processing this document."} onClose={onClose} />
          )}

          {!docLoadError && doc?.status === "ready" && !historyLoaded && <StatusSkeleton label="Loading conversation…" />}

          {!docLoadError &&
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

          {isStreaming && (streamingContent ? <AssistantBubble content={streamingContent} streaming /> : <TypingRow />)}

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

      {doc?.status === "ready" && (
        <div className="border-t border-white/10 bg-black px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-[760px]">
            <AnimatePresence>
              {examComposerOpen && (
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

            {examError && <p className="mb-2 text-[12px] text-white/50">{examError}</p>}
            {chatError && <p className="mb-2 text-[12px] text-white/50">{chatError}</p>}

            <div className="flex items-end gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-2.5 py-2 transition-colors focus-within:border-white/30">
              <button
                type="button"
                onClick={() => setExamComposerOpen((v) => !v)}
                title="Generate an exam"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                  examComposerOpen ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <GraduationCap size={17} />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                rows={1}
                placeholder="Message SnipixAI…"
                className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-6 text-white placeholder:text-white/30 outline-none disabled:opacity-50"
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
            <p className="mt-2 text-center text-[10.5px] text-white/25">AI-generated content may be inaccurate. Verify important information.</p>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "overlay") {
    if (!isMounted) return null;
    return createPortal(content, document.body);
  }

  return content;
}
