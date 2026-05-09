import { getPineconeIndex }           from "../../config/pinecone";
import { TextChunk, RetrievedChunk }  from "../../types";
import { logger }                     from "../../config/logger";
import { env }                        from "../../config/env";

const BATCH = 100;

const isPineconeReady = (): boolean => {
  try {
    getPineconeIndex();
    return true;
  } catch {
    return false;
  }
};

export const upsertChunks = async (chunks: TextChunk[]): Promise<number> => {
  // Mock mode when Pinecone is not available or initialization failed
  if (!env.PINECONE_API_KEY || !isPineconeReady()) {
    logger.info(`[MOCK] Mock upserting ${chunks.length} chunks...`);
    return chunks.length;
  }

  const index   = getPineconeIndex();
  const vectors = chunks
    .filter((c) => c.vector)
    .map((c) => ({
      id:       c.chunkId,
      values:   c.vector!,
      metadata: c.metadata,
    }));

  let total = 0;
  for (let i = 0; i < vectors.length; i += BATCH) {
    const batch = vectors.slice(i, i + BATCH);
    await index.upsert(batch);
    total += batch.length;
    logger.info(`Upserted batch: ${batch.length} vectors`);
  }
  return total;
};

export const similaritySearch = async (
  queryVector: number[],
  documentId:  string,
  userId:      string,
  topK = 5
): Promise<RetrievedChunk[]> => {
  // Mock mode when Pinecone is not available or initialization failed
  if (!env.PINECONE_API_KEY || !isPineconeReady()) {
    logger.info(`[MOCK] Mock similarity search returning ${topK} results...`);
    return Array.from({ length: topK }, (_, i) => ({
      chunkId: `mock-chunk-${i}`,
      score: 0.8 - (i * 0.1),
      text: `Mock chunk ${i + 1}: This is sample text from the document that would be relevant to the query.`,
    }));
  }

  const index   = getPineconeIndex();
  const results = await index.query({
    vector:          queryVector,
    topK,
    includeMetadata: true,
    filter: {
      documentId: { $eq: documentId },
      userId:     { $eq: userId },
    },
  });

  return (results.matches ?? []).map((m) => ({
    chunkId: m.id,
    score:   Math.round((m.score ?? 0) * 10000) / 10000,
    text:    (m.metadata?.["text"] as string) ?? "",
  }));
};

export const deleteDocumentVectors = async (
  documentId: string
): Promise<void> => {
  // Mock mode when Pinecone is not available or initialization failed
  if (!env.PINECONE_API_KEY || !isPineconeReady()) {
    logger.info(`[MOCK] Mock deleting vectors for doc: ${documentId}`);
    return;
  }

  const index = getPineconeIndex();
  await index.deleteMany({ documentId: { $eq: documentId } });
  logger.info(`Deleted vectors for doc: ${documentId}`);
};