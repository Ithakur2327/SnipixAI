export type SourceType =
  | "pdf" | "docx" | "ppt" | "txt"
  | "url" | "image" | "raw_text";

export type DocumentStatus =
  | "pending" | "extracting" | "ready" | "failed";

export type OutputType =
  | "tldr" | "bullets" | "key_insights"
  | "action_points" | "section_summary";

export type Plan = "free" | "pro";

export interface User {
  _id: string;
  name: string;
  email: string;
  plan: Plan;
  usageCount: number;
  usageLimit: number;
}

export interface Document {
  _id: string;
  title: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  status: DocumentStatus;
  wordCount: number;
  pageCount: number | null;
  createdAt: string;
  summaryCount: number;
}

export interface Summary {
  summaryId: string;
  documentId: string;
  outputType: OutputType;
  content: string | string[];
  model: string;
  processingTimeMs: number;
}

export interface ChatSource {
  chunkId: string;
  chunkText: string;
  score: number;
}

export interface ChatMessage {
  _id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatSource[];
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}