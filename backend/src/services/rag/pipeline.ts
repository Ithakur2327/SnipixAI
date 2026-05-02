import { Document }       from "../../models/Document";
import { Chunk }          from "../../models/Chunk";
import { extractText }    from "../extractors/index";
import { splitIntoChunks } from "./chunker";
import { embedChunks, embedQuery } from "./embedder";
import {
  upsertChunks,
  similaritySearch,
  deleteDocumentVectors,
} from "./vectorStore";
import { generateRAGAnswer, generateSummary } from "./ragChain";
import { OutputType, SourceType } from "../../types";

// ── Process a document (extract → chunk → embed → upsert) ──
export const processDocument = async (
  documentId: string,
  userId: string
): Promise<void> => {
  try {
    const doc = await Document.findById(documentId);
    if (!doc) throw new Error("Document not found");

    await Document.findByIdAndUpdate(documentId, { status: "extracting" });

    // 1. Extract text
    const { text, pageCount } = await extractText({
      sourceType: doc.sourceType as SourceType,
      sourceUrl:  doc.sourceUrl ?? undefined,
      rawText:    doc.rawText   || undefined,
    });

    // 2. Save raw text
    await Document.findByIdAndUpdate(documentId, {
      rawText:   text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      pageCount: pageCount ?? null,
    });

    // 3. Chunk
    const chunks = await splitIntoChunks(text, documentId, userId);

    // 4. Embed
    const embeddedChunks = await embedChunks(chunks);

    // 5. Save chunks to MongoDB
    const chunkDocs = embeddedChunks.map((c) => ({
      documentId,
      userId,
      chunkIndex:     c.index,
      text:           c.text,
      tokenCount:     c.tokenCount,
      vectorId:       c.chunkId,
      embeddingModel: "text-embedding-3-small",
    }));
    await Chunk.insertMany(chunkDocs);

    // 6. Upsert to Pinecone
    await upsertChunks(embeddedChunks);

    // 7. Mark ready
    await Document.findByIdAndUpdate(documentId, { status: "ready" });
  } catch (err) {
    await Document.findByIdAndUpdate(documentId, { status: "failed" });
    console.error("[processDocument] error:", err);
  }
};

// ── Query a document with RAG ──
export const queryDocument = async (
  documentId: string,
  userId:     string,
  question:   string,
  chatHistory: Array<{ role: string; content: string }>,
  topK = 5
) => {
  // Embed query
  const queryVector = await embedQuery(question);

  // Search Pinecone
  const results = await similaritySearch(queryVector, documentId, userId, topK);

  // Generate answer
  const { answer, model, processingMs, sources } =
    await generateRAGAnswer(question, results, chatHistory);

  return { answer, model, processingMs, sources };
};

// ── Summarize a document ──
export const summarizeDocument = async ({
  documentId,
  rawText,
  outputType,
}: {
  documentId: string;
  rawText:    string;
  outputType: OutputType;
}) => {
  return generateSummary(rawText, outputType);
};

// ── Delete all vectors for a document ──
export const deleteDocument = async (documentId: string): Promise<void> => {
  await Promise.all([
    Chunk.deleteMany({ documentId }),
    deleteDocumentVectors(documentId),
  ]);
};