import axios from "axios";
import { Document } from "../../models/Document";
import { Chunk }    from "../../models/Chunk";
import { OutputType, SourceType } from "../../types";

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000/api/rag";

const ragClient = axios.create({
  baseURL: RAG_SERVICE_URL,
  timeout: 120_000, // 2 min for large docs
});

// ── Process document ──
export const processDocument = async (
  documentId: string,
  userId: string
): Promise<void> => {
  try {
    const doc = await Document.findById(documentId);
    if (!doc) throw new Error("Document not found");

    await Document.findByIdAndUpdate(documentId, { status: "extracting" });

    // Call Python RAG service
    await ragClient.post("/process", {
      document_id: documentId,
      user_id:     userId,
      source_type: doc.sourceType,
      source_url:  doc.sourceUrl  || undefined,
      raw_text:    doc.rawText    || undefined,
    });

    // Background — Python service updates status itself
  } catch (err) {
    await Document.findByIdAndUpdate(documentId, { status: "failed" });
    console.error("[processDocument] error:", err);
  }
};

// ── Summarize document ──
export const summarizeDocument = async ({
  documentId,
  rawText,
  outputType,
}: {
  documentId: string;
  rawText:    string;
  outputType: OutputType;
}) => {
  const { data } = await ragClient.post("/summarize", {
    document_id: documentId,
    raw_text:    rawText,
    output_type: outputType,
  });
  return {
    content:          data.content,
    model:            data.model,
    processingTimeMs: data.processing_time_ms,
    tokenUsage:       data.token_usage,
  };
};

// ── Query document (RAG chat) ──
export const queryDocument = async (
  documentId:  string,
  userId:      string,
  question:    string,
  chatHistory: Array<{ role: string; content: string }>,
  topK = 5
) => {
  const { data } = await ragClient.post("/chat", {
    document_id:  documentId,
    user_id:      userId,
    question,
    chat_history: chatHistory,
    top_k:        topK,
  });
  return {
    answer:       data.answer,
    model:        data.model,
    processingMs: data.processing_ms,
    sources:      data.sources,
  };
};

// ── Delete document ──
export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    await ragClient.delete(`/document/${documentId}`);
    await Chunk.deleteMany({ documentId });
  } catch (err) {
    console.error("[deleteDocument] error:", err);
  }
};