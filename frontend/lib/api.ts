import axios from "axios";
import type {
  ApiResponse,
  ChatMessage,
  Document,
  ExamType,
  User,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem("snipix_token");
  if (!token) {
    const persisted = localStorage.getItem("snipix-auth");
    if (persisted) {
      try {
        token = JSON.parse(persisted)?.state?.token ?? null;
        if (token) localStorage.setItem("snipix_token", token);
      } catch {
        token = null;
      }
    }
  }
  return token;
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("snipix_token");
      localStorage.removeItem("snipix_user");
      localStorage.removeItem("snipix-auth");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (name: string, email: string, password: string) =>
    api.post<ApiResponse<{ user: User; token: string }>>("/auth/register", { name, email, password }),
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ user: User; token: string }>>("/auth/login", { email, password }),
  me: () => api.get<ApiResponse<{ user: User }>>("/auth/me"),
  logout: () => api.post<ApiResponse<{ message: string }>>("/auth/logout"),
};

export const userAPI = {
  getProfile: () => api.get<ApiResponse<{ user: User }>>("/users/profile"),
  updateProfile: (updates: { name?: string; avatarUrl?: string }) =>
    api.patch<ApiResponse<{ user: User }>>("/users/profile", updates),
  getUsage: () =>
    api.get<
      ApiResponse<{
        plan: string;
        documentsUsed: number;
        documentsLimit: number;
        aiRequestsUsedToday: number;
        aiRequestsLimit: number;
      }>
    >("/users/usage"),
};

export const documentAPI = {
  uploadFile: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<ApiResponse<{ document: Document }>>("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
  },
  createFromUrl: (url: string, title?: string) =>
    api.post<ApiResponse<{ document: Document }>>("/documents/url", { url, title }),
  createFromText: (text: string, title?: string) =>
    api.post<ApiResponse<{ document: Document }>>("/documents/text", { text, title }),
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<ApiResponse<{ documents: Document[]; total: number }>>("/documents", { params }),
  get: (documentId: string) => api.get<ApiResponse<{ document: Document }>>(`/documents/${documentId}`),
  getStatus: (documentId: string) =>
    api.get<ApiResponse<{ status: string; errorMessage: string | null }>>(`/documents/${documentId}/status`),
  delete: (documentId: string) => api.delete<ApiResponse<{ message: string }>>(`/documents/${documentId}`),
};

export const chatAPI = {
  getHistory: (documentId: string) =>
    api.get<ApiResponse<{ messages: ChatMessage[] }>>(`/chat/${documentId}/history`),
  clearHistory: (documentId: string) => api.delete<ApiResponse<{ message: string }>>(`/chat/${documentId}/history`),
};

export const examAPI = {
  generate: (
    documentId: string,
    params: {
      examType: ExamType;
      topic?: string;
      useDocument: boolean;
      numQuestions: number;
      difficulty?: "easy" | "medium" | "hard";
    }
  ) => api.post<ApiResponse<{ message: ChatMessage }>>(`/exam/${documentId}/generate`, params),
  submitQuiz: (messageId: string, answers: Record<string, number>) =>
    api.patch<ApiResponse<{ message: ChatMessage }>>(`/exam/${messageId}/submit`, { answers }),
  revealAnswer: (messageId: string, questionId: string, revealed: boolean) =>
    api.patch<ApiResponse<{ message: ChatMessage }>>(`/exam/${messageId}/reveal`, {
      questionId,
      revealed,
    }),
};

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "done"; messageId: string; sources: ChatMessage["sources"]; createdAt: string }
  | { type: "error"; message: string };

export async function streamChatMessage(
  documentId: string,
  message: string,
  handlers: { onEvent: (event: StreamEvent) => void; signal?: AbortSignal }
): Promise<void> {
  const token = readToken();
  const response = await fetch(`${API_BASE_URL}/chat/${documentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    let errorMessage = "Something went wrong. Please try again.";
    try {
      const parsed = await response.json();
      errorMessage = parsed?.error?.message || errorMessage;
    } catch {
    }
    handlers.onEvent({ type: "error", message: errorMessage });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const rawEvent of events) {
      const eventTypeMatch = rawEvent.match(/^event:\s*(.+)$/m);
      const dataMatch = rawEvent.match(/^data:\s*(.+)$/m);
      if (!eventTypeMatch || !dataMatch) continue;

      try {
        const parsed = JSON.parse(dataMatch[1]);
        const eventType = eventTypeMatch[1].trim();
        if (eventType === "token") {
          handlers.onEvent({ type: "token", content: parsed.content });
        } else if (eventType === "done") {
          handlers.onEvent({
            type: "done",
            messageId: parsed.messageId,
            sources: parsed.sources ?? [],
            createdAt: parsed.createdAt,
          });
        } else if (eventType === "error") {
          handlers.onEvent({ type: "error", message: parsed.message });
        }
      } catch {
      }
    }
  }
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || fallback;
  }
  return fallback;
}
