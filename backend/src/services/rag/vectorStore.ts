import { getPineconeIndex }           from "../../config/pinecone";
import { TextChunk, RetrievedChunk }  from "../../types";
import { logger }                     from "../../config/logger";

const BATCH = 100;

export const upsertChunks = async (chunks: TextChunk[]): Promise<number> => {
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
  const index = getPineconeIndex();
  await index.deleteMany({ documentId: { $eq: documentId } });
  logger.info(`Deleted vectors for doc: ${documentId}`);
};