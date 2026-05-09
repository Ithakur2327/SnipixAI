import { OpenAIEmbeddings } from "@langchain/openai";
import { env }              from "../../config/env";
import { logger }           from "../../config/logger";
import { TextChunk }        from "../../types";

let _embedder: OpenAIEmbeddings | null = null;

const getEmbedder = (): OpenAIEmbeddings => {
  if (!_embedder) {
    _embedder = new OpenAIEmbeddings({
      model:        env.OPENAI_EMBEDDING_MODEL,
      openAIApiKey: env.OPENAI_API_KEY,
    });
  }
  return _embedder;
};

export const embedChunks = async (chunks: TextChunk[]): Promise<TextChunk[]> => {
  if (chunks.length === 0) return [];

  const embedder = getEmbedder();
  const texts    = chunks.map((c) => c.text);

  logger.info(`[Embedder] Embedding ${texts.length} chunks...`);

  // Batch in groups of 100 to avoid rate limits
  const BATCH = 100;
  const allVectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch   = texts.slice(i, i + BATCH);
    const vectors = await embedder.embedDocuments(batch);
    allVectors.push(...vectors);
    if (texts.length > BATCH) {
      logger.info(`[Embedder] Batch ${Math.floor(i / BATCH) + 1} done`);
    }
  }

  return chunks.map((chunk, i) => ({ ...chunk, vector: allVectors[i] }));
};

export const embedQuery = async (query: string): Promise<number[]> => {
  return getEmbedder().embedQuery(query);
};