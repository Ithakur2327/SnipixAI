import { OpenAIEmbeddings } from "@langchain/openai";
import { env }              from "../../config/env";
import { logger }           from "../../config/logger";
import { TextChunk }        from "../../types";

let _embedder: OpenAIEmbeddings | null = null;

const getEmbedder = (): OpenAIEmbeddings => {
  if (!_embedder) {
    _embedder = new OpenAIEmbeddings({
      model:      env.OPENAI_EMBEDDING_MODEL,
      openAIApiKey: env.OPENAI_API_KEY,
    });
  }
  return _embedder;
};

export const embedChunks = async (chunks: TextChunk[]): Promise<TextChunk[]> => {
  // Mock mode when OpenAI is not available
  if (!env.OPENAI_API_KEY) {
    logger.info(`[MOCK] Mock embedding ${chunks.length} chunks...`);
    return chunks.map((chunk) => ({
      ...chunk,
      vector: Array.from({ length: env.PINECONE_DIMENSION }, () => Math.random())
    }));
  }

  const embedder = getEmbedder();
  const texts    = chunks.map((c) => c.text);

  logger.info(`Embedding ${texts.length} chunks...`);
  const vectors = await embedder.embedDocuments(texts);

  return chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] }));
};

export const embedQuery = async (query: string): Promise<number[]> => {
  // Mock mode when OpenAI is not available
  if (!env.OPENAI_API_KEY) {
    logger.info(`[MOCK] Mock embedding query...`);
    return Array.from({ length: env.PINECONE_DIMENSION }, () => Math.random());
  }

  return getEmbedder().embedQuery(query);
};