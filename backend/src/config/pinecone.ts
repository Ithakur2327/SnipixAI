import { Pinecone } from "@pinecone-database/pinecone";
import { env }      from "./env";
import { logger }   from "./logger";

let _index: ReturnType<Pinecone["index"]> | null = null;

export const initPinecone = async (): Promise<void> => {
  try {
    const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    const existing = (await pc.listIndexes()).indexes?.map((i) => i.name) ?? [];

    if (!existing.includes(env.PINECONE_INDEX)) {
      logger.info(`Creating Pinecone index: ${env.PINECONE_INDEX}`);
      await pc.createIndex({
        name:      env.PINECONE_INDEX,
        dimension: env.PINECONE_DIMENSION,
        metric:    "cosine",
        spec: { serverless: { cloud: "aws", region: "us-east-1" } },
      });
      logger.info("✅ Pinecone index created");
    }

    _index = pc.index(env.PINECONE_INDEX);
    logger.info(`✅ Pinecone ready: ${env.PINECONE_INDEX}`);
  } catch (err) {
    // Pinecone fail hone par server crash nahi hoga
    logger.warn("⚠️ Pinecone unavailable — RAG features disabled. Error: " + (err as Error).message);
    _index = null;
  }
};

export const getPineconeIndex = () => {
  if (!_index) throw new Error("Pinecone not available. Check your API key and network.");
  return _index;
};