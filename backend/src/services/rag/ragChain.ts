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

  // Mock mode when OpenAI is not available
  if (!env.OPENAI_API_KEY) {
    logger.info("[MOCK] Using mock RAG answer");
    const ms = Date.now() - start;
    return {
      answer: `Mock answer: Based on the document content, ${question.toLowerCase().includes('what') ? 'the document discusses key points and insights' : 'here are the relevant findings'}. This is a simulated response for testing purposes.`,
      model: "mock-gpt-4o",
      processingMs: ms,
      sources: chunks.slice(0, 3).map((c, i) => ({
        chunkId: c.chunkId,
        score: c.score,
        chunkText: c.text.slice(0, 200),
      })),
    };
  }

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

  // Mock mode when OpenAI is not available
  if (!env.OPENAI_API_KEY) {
    console.log("[MOCK] Using mock summary response");
    const mockResponses: Record<OutputType, any> = {
      tldr: "This document contains important information about the topic discussed.",
      bullets: [
        "Key point 1: Important information extracted from the document",
        "Key point 2: Additional insights from the content",
        "Key point 3: Main conclusions and findings",
        "Key point 4: Recommendations and next steps",
        "Key point 5: Summary of key metrics or data points"
      ],
      key_insights: [
        "Strategic insight: The document reveals important patterns",
        "Market insight: Competitive landscape analysis",
        "Operational insight: Process improvements identified",
        "Financial insight: Cost optimization opportunities",
        "Risk insight: Potential challenges and mitigation strategies"
      ],
      action_points: [
        "Implement recommended changes immediately",
        "Schedule follow-up meetings with stakeholders",
        "Conduct additional research on identified gaps",
        "Update documentation and procedures",
        "Monitor progress and adjust as needed"
      ],
      section_summary: [
        { section: "Introduction", summary: "Overview of the main topic and objectives" },
        { section: "Analysis", summary: "Detailed examination of data and findings" },
        { section: "Conclusions", summary: "Key takeaways and recommendations" },
        { section: "Recommendations", summary: "Specific actions and next steps" }
      ]
    };

    const ms = Date.now() - start;
    return {
      content: mockResponses[outputType],
      model: "mock-gpt-4o",
      processingTimeMs: ms,
      tokenUsage: {
        prompt: 100,
        completion: 50,
        total: 150,
      },
    };
  }

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