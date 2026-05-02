import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err: unknown) {
    logger.error(`❌ MongoDB failed: ${(err as Error).message}`);
    process.exit(1);
  }
};