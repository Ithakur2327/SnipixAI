import axios from "axios";
import { env } from "../../config/env";
import { Document } from "../../models/Document";
import { cloudinary } from "../../config/cloudinary";

const RAG_BASE = process.env.RAG_SERVICE_URL || "http://localhost:8000/api/rag";

// ── Shared axios instance ──────────────────────────────────────
const ragClient = axios.create({
  baseURL: RAG_BASE,
  timeout: 120_000, // 2 min for large docs
});

// ── Process document (extract → chunk → embed → upsert) ───────
export async function processDocument(
  documentId: string,
  userId: string
): Promise<void> {
  const doc = await Document.findById(documentId).lean();
  if (!doc) throw new Error(`Document ${documentId} not found`);

  try {
    await ragClient.post("/process/sync", {
      document_id: documentId,
      user_id:     userId,
      source_type: doc.sourceType,
      source_url:  doc.sourceUrl  ?? null,
      raw_text:    doc.rawText    ?? null,
    });
  } catch (err: any) {
    // Mark doc as failed in MongoDB
    await Document.findByIdAndUpdate(documentId, {
      $set: {
        status:       "failed",
        errorMessage: err?.response?.data?.detail ?? err.message ?? "RAG pipeline error",
      },
    });
    throw err;
  }
}

// ── Summarize document ─────────────────────────────────────────
export async function summarizeDocument({
  documentId,
  rawText,
  outputType,
}: {
  documentId: string;
  rawText:    string;
  outputType: string;
}): Promise<{
  content:          any;
  model:            string;
  processingTimeMs: number;
  tokenUsage:       { prompt: number; completion: number; total: number };
}> {
  const { data } = await ragClient.post("/summarize", {
    document_id: documentId,
    raw_text:    rawText,
    output_type: outputType,
  });

  return {
    content:          data.content,
    model:            data.model,
    processingTimeMs: data.processing_time_ms,
    tokenUsage: {
      prompt:     data.token_usage?.prompt     ?? 0,
      completion: data.token_usage?.completion ?? 0,
      total:      data.token_usage?.total      ?? 0,
    },
  };
}

// ── RAG chat query ─────────────────────────────────────────────
export async function queryDocument(
  documentId:  string,
  userId:      string,
  question:    string,
  chatHistory: { role: string; content: string }[] = [],
  topK = 5
): Promise<{
  answer:  string;
  sources: { chunkId: string; chunkText: string; score: number }[];
}> {
  const { data } = await ragClient.post("/chat", {
    document_id:  documentId,
    user_id:      userId,
    question,
    chat_history: chatHistory,
    top_k:        topK,
  });

  return {
    answer: data.answer,
    sources: (data.sources ?? []).map((s: any) => ({
      chunkId:   s.chunk_id   ?? "",
      chunkText: s.chunk_text ?? "",
      score:     s.score      ?? 0,
    })),
  };
}