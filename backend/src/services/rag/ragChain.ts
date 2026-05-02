import { ChatOpenAI }                  from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { env }                         from "../../config/env";
import { logger }                      from "../../config/logger";
import { RetrievedChunk, OutputType }  from "../../types";

let _llm: ChatOpenAI | null = null;

const getLLM = (): ChatOpenAI => {
  if (!_llm) {
    _llm = new ChatOpenAI({
      model:        env.OPENAI_CHAT_MODEL,
      openAIApiKey: env.OPENAI_API_KEY,
      temperature:  0.2,
      maxTokens:    1500,
    });
  }
  return _llm;
};

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

const PROMPTS: Record<OutputType, string> = {
  tldr:            "Write a 2-4 sentence TL;DR. Be crisp and direct.",
  bullets:         "Extract 5-8 key points. Return ONLY a JSON array of strings. No markdown.",
  key_insights:    "Extract 4-6 strategic insights. Return ONLY a JSON array of strings.",
  action_points:   "List all action items. Return ONLY a JSON array of strings. Empty array if none.",
  section_summary: `Identify sections and summarize each. Return ONLY a JSON array: [{"section":"...","summary":"..."}]`,
};

export const generateSummary = async (
  rawText:    string,
  outputType: OutputType
) => {
  const start  = Date.now();
  const text   = rawText.slice(0, 48_000);
  const suffix = PROMPTS[outputType];

  const llm = getLLM();
  const res = await llm.invoke([
    new SystemMessage(
      "You are an expert document summarizer. Follow the output format exactly."
    ),
    new HumanMessage(`Document:\n\n${text}\n\nTask: ${suffix}`),
  ]);

  const raw = (res.content as string).trim();
  const ms  = Date.now() - start;

  let content: unknown;
  if (outputType === "tldr") {
    content = raw;
  } else {
    try {
      content = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      content = raw
        .split("\n")
        .filter(Boolean)
        .map((l) => l.replace(/^[-•*]\s*/, ""));
    }
  }

  const meta = (
    res as unknown as {
      response_metadata?: {
        token_usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };
    }
  ).response_metadata?.token_usage;

  logger.info(`[AI] ${outputType} summary in ${ms}ms`);

  return {
    content,
    model:            env.OPENAI_CHAT_MODEL,
    processingTimeMs: ms,
    tokenUsage: {
      prompt:     meta?.prompt_tokens     ?? 0,
      completion: meta?.completion_tokens ?? 0,
      total:      meta?.total_tokens      ?? 0,
    },
  };
};