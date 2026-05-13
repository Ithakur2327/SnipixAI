import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    let token = localStorage.getItem("snipix_token");

    if (!token) {
      try {
        const persisted = localStorage.getItem("snipix-auth");
        if (persisted) {
          const parsed = JSON.parse(persisted);
          token = parsed?.state?.token ?? null;
          if (token) localStorage.setItem("snipix_token", token);
        }
      } catch {}
    }

    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const error = err.response?.data?.error;
    const status = err.response?.status;

    if (status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("snipix_token");
        localStorage.removeItem("snipix_user");
        localStorage.removeItem("snipix-auth");
      }
    }

    return Promise.reject(error || err);
  }
);

export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const documentAPI = {
  list: (page = 1, limit = 20) =>
    api.get("/documents", { params: { page, limit } }),
  get: (id: string) => api.get(`/documents/${id}`),
  status: (id: string) => api.get(`/documents/${id}/status`),
  uploadFile: (formData: FormData) =>
    api.post("/documents/upload", formData),
  submitUrl: (url: string, title?: string) =>
    api.post("/documents/url", { url, title }),
  submitText: (text: string, title?: string) =>
    api.post("/documents/text", { text, title }),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export const summaryAPI = {
  create: (documentId: string, outputType: string) =>
    api.post(`/summaries/${documentId}`, { outputType }),
  list: (documentId: string) => api.get(`/summaries/${documentId}`),
  delete: (documentId: string, summaryId: string) =>
    api.delete(`/summaries/${documentId}/${summaryId}`),
};

export const ragAPI = {
  chat: (documentId: string, question: string, topK = 5) =>
    api.post(`/rag/${documentId}/chat`, { question, topK }),
  history: (documentId: string, page = 1) =>
    api.get(`/rag/${documentId}/history`, { params: { page } }),
  clearChat: (documentId: string) =>
    api.delete(`/rag/${documentId}/chat`),
};

export const userAPI = {
  profile: () => api.get("/users/profile"),
  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    api.put("/users/profile", data),
  usage: () => api.get("/users/usage"),
};

export default api;