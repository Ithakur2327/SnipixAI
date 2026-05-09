import { ChatOpenAI }                  from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { env }                         from "../../config/env";
import { logger }                      from "../../config/logger";
import { RetrievedChunk, OutputType }  from "../../types";

let _llm: ChatOpenAI | null = null;
let _summaryLlm: ChatOpenAI | null = null;

const getLLM = (): ChatOpenAI => {
  if (!_llm) {
    _llm = new ChatOpenAI({
      model:        env.OPENAI_CHAT_MODEL,
      openAIApiKey: env.OPENAI_API_KEY,
      temperature:  0.2,
      maxTokens:    2000,
    });
  }
  return _llm;
};

const getSummaryLLM = (): ChatOpenAI => {
  if (!_summaryLlm) {
    _summaryLlm = new ChatOpenAI({
      model:        env.OPENAI_SUMMARIZE_MODEL,
      openAIApiKey: env.OPENAI_API_KEY,
      temperature:  0.2,
      maxTokens:    2000,
    });
  }
  return _summaryLlm;
};

// ── RAG Chat Answer ─────────────────────────────────────────────────────────
export const generateRAGAnswer = async (
  question:    string,
  chunks:      RetrievedChunk[],
  chatHistory: Array<{ role: string; content: string }> = []
) => {
  const start = Date.now();

  const context = chunks
    .map((c, i) => `[Chunk ${i + 1} | Score: ${c.score}]\n${c.text}`)
    .join("\n\n---\n\n");

  const historyStr = chatHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const system = `You are SnipixAI, an expert document analyst.
Answer ONLY based on the provided context chunks.
If the answer is not in the context, say: "I couldn't find that in the document."
Be concise, use bullet points for lists, never hallucinate.`;

  const user = `Context:\n${context}\n\n${
    historyStr ? `History:\n${historyStr}\n\n` : ""
  }Question: ${question}\n\nAnswer:`;

  const llm      = getLLM();
  const response = await llm.invoke([
    new SystemMessage(system),
    new HumanMessage(user),
  ]);

  const ms = Date.now() - start;
  logger.info(`[RAG] Answer generated in ${ms}ms`);

  return {
    answer:       response.content as string,
    model:        env.OPENAI_CHAT_MODEL,
    processingMs: ms,
    sources:      chunks.map((c) => ({
      chunkId:   c.chunkId,
      score:     c.score,
      chunkText: c.text.slice(0, 300),
    })),
  };
};

// ── Summary Prompts ──────────────────────────────────────────────────────────
const PROMPTS: Record<OutputType, string> = {
  tldr:
    "Write a clear, comprehensive 3-5 sentence TL;DR summary of the entire document. Be specific and direct.",
  bullets:
    "Extract 6-10 key points from this document. Return ONLY a valid JSON array of strings. Example: [\"Point 1\", \"Point 2\"]. No markdown, no explanation, just the JSON array.",
  key_insights:
    "Extract 5-8 strategic insights or important takeaways from this document. Return ONLY a valid JSON array of strings. Example: [\"Insight 1\", \"Insight 2\"]. No markdown, just the JSON array.",
  action_points:
    "List all action items, tasks, or recommendations mentioned in this document. Return ONLY a valid JSON array of strings. If none, return []. Example: [\"Action 1\", \"Action 2\"]. No markdown, just the JSON array.",
  section_summary:
    `Identify major topics/sections in this document and summarize each. Return ONLY a valid JSON array like this exact format: [{"section":"Section Name","summary":"Brief summary here"}]. No markdown, no extra text, just the JSON array.`,
};

// ── Map-reduce chunked summarization for large documents ─────────────────────
const CHAR_LIMIT = 55_000; // ~14k tokens, safe for gpt-4o-mini context

const summarizeOneChunk = async (
  llm:        ChatOpenAI,
  text:       string,
  prompt:     string,
  isPartial:  boolean
): Promise<string> => {
  const taskPrompt = isPartial
    ? "Summarize the key points of this section as concise bullet points."
    : prompt;

  const res = await llm.invoke([
    new SystemMessage(
      "You are an expert document summarizer. Follow the output format exactly. Return only the requested format with no preamble or explanation."
    ),
    new HumanMessage(`Document${isPartial ? " section" : ""}:\n\n${text}\n\nTask: ${taskPrompt}`),
  ]);
  return (res.content as string).trim();
};

export const generateSummary = async (
  rawText:    string,
  outputType: OutputType
) => {
  const start  = Date.now();
  const llm    = getSummaryLLM();
  const prompt = PROMPTS[outputType];

  let finalRaw: string;

  if (rawText.length <= CHAR_LIMIT) {
    // Small doc: single call
    finalRaw = await summarizeOneChunk(llm, rawText, prompt, false);
  } else {
    // Large doc: map-reduce
    logger.info(`[AI] Large doc (${rawText.length} chars) — map-reduce summarization`);

    // Split into chunks
    const parts: string[] = [];
    for (let i = 0; i < rawText.length; i += CHAR_LIMIT) {
      parts.push(rawText.slice(i, i + CHAR_LIMIT));
    }

    // Map: summarize each chunk in parallel
    const partials = await Promise.all(
      parts.map((part) => summarizeOneChunk(llm, part, prompt, true))
    );

    // Reduce: combine and final pass
    const combined = partials.join("\n\n---\n\n");
    finalRaw = await summarizeOneChunk(llm, combined, prompt, false);
  }

  const ms = Date.now() - start;

  // Parse content
  let content: unknown;
  if (outputType === "tldr") {
    content = finalRaw;
  } else {
    // Remove markdown code fences if present
    const cleaned = finalRaw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/,          "")
      .trim();

    try {
      content = JSON.parse(cleaned);
    } catch {
      // Fallback: split by newlines and clean bullets
      const lines = cleaned
        .split("\n")
        .map((l) => l.replace(/^[-•*\d.)\]]+\s*/, "").trim())
        .filter((l) => l.length > 0);
      content = lines.length > 0 ? lines : [cleaned];
    }
  }

  // Safety: ensure non-empty
  if (Array.isArray(content) && content.length === 0) {
    content = ["The document was processed but no content could be extracted."];
  }

  logger.info(`[AI] ${outputType} summary done in ${ms}ms`);

  return {
    content,
    model:            env.OPENAI_CHAT_MODEL,
    processingTimeMs: ms,
    tokenUsage: {
      prompt:     0,
      completion: 0,
      total:      0,
    },
  };
};