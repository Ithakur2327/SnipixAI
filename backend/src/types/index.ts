import { Request } from "express";
import { Types, Document as MongoDoc } from "mongoose";

export type OutputType =
  | "tldr"
  | "bullets"
  | "key_insights"
  | "action_points"
  | "section_summary";

export type SourceType =
  | "pdf" | "docx" | "ppt" | "txt"
  | "url" | "image" | "raw_text";

export interface IUser extends MongoDoc {
  name: string;
  email: string;
  passwordHash: string;
  plan: "free" | "pro";
  usageCount: number;
  usageLimit: number;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  toPublicJSON(): object;
}

export interface IDocument extends MongoDoc {
  userId: Types.ObjectId;
  title: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  cloudinaryId: string | null;
  rawText: string;
  wordCount: number;
  pageCount: number | null;
  status: "pending" | "extracting" | "ready" | "failed";
  summaryCount: number;
  metadata: {
    originalName: string;
    mimeType: string;
    fileSize: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISummary extends MongoDoc {
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  outputType: OutputType;
  content: unknown;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  processingTimeMs: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  createdAt: Date;
}

export interface IChunk extends MongoDoc {
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  vectorId: string;
  embeddingModel: string;
  createdAt: Date;
}

export interface IChatMessage extends MongoDoc {
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  sources: Array<{
    chunkId: Types.ObjectId;
    chunkText: string;
    score: number;
  }>;
  modelName: string | null;
  processingTimeMs: number | null;
  createdAt: Date;
}

export interface TextChunk {
  chunkId:    string;
  text:       string;
  index:      number;
  tokenCount: number;
  vector?:    number[];
  metadata: {
    documentId: string;
    userId:     string;
    chunkIndex: number;
    text:       string;
  };
}

export interface RetrievedChunk {
  chunkId: string;
  score:   number;
  text:    string;
}

export interface AuthRequest extends Request {
  user?: IUser;
}