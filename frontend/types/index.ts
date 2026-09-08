export type SourceType =
  | "pdf" | "docx" | "ppt" | "txt"
  | "url" | "image" | "raw_text";

export type DocumentStatus = "processing" | "ready" | "error";

export type Plan = "free" | "pro";

export interface User {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  sourceType: SourceType;
  status: DocumentStatus;
  wordCount: number | null;
  pageCount: number | null;
  messageCount: number;
  errorMessage?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageSource {
  chunkId: string;
  text: string;
  score: number;
}

export type ExamType = "quiz" | "subjective";

export interface ExamQuestion {
  id: string;
  question: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  answer?: string;
}

export interface ExamScore {
  correct: number;
  total: number;
}

export interface ExamData {
  examType: ExamType;
  topic: string;
  questions: ExamQuestion[];
  userAnswers: Record<string, number>;
  submitted: boolean;
  revealed: Record<string, boolean>;
  score: ExamScore | null;
}

export type MessageType = "text" | "exam";
export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  documentId: string;
  role: MessageRole;
  type: MessageType;
  content: string | null;
  sources: MessageSource[];
  exam: ExamData | null;
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
