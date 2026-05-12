import dotenv from "dotenv";
dotenv.config();

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`❌ Missing env: ${key}`);
  return val;
};

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",

  // Mongo / Auth
  MONGO_URI: required("MONGO_URI"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: required("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: required("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: required("CLOUDINARY_API_SECRET"),

  // Groq
  GROQ_API_KEY: required("GROQ_API_KEY"),

  CHAT_MODEL:
    process.env.CHAT_MODEL || "llama-3.3-70b-versatile",

  SUMMARIZE_MODEL:
    process.env.SUMMARIZE_MODEL || "llama-3.3-70b-versatile",

  // Pinecone
  PINECONE_API_KEY: required("PINECONE_API_KEY"),
  PINECONE_INDEX: process.env.PINECONE_INDEX || "snipixai",
  PINECONE_DIMENSION:
    Number(process.env.PINECONE_DIMENSION) || 1536,

  // Limits
  FREE_PLAN_LIMIT:
    Number(process.env.FREE_PLAN_LIMIT) || 10,

  PRO_PLAN_LIMIT:
    Number(process.env.PRO_PLAN_LIMIT) || 500,

  MAX_FILE_SIZE_MB:
    Number(process.env.MAX_FILE_SIZE_MB) || 20,
} as const;