"use client";
import { create } from "zustand";

interface User {
  _id: string;
  name: string;
  email: string;
  plan: string;
  usageCount: number;
  usageLimit: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,

  setAuth: (user, token) => {
    localStorage.setItem("snipix_token", token);
    localStorage.setItem("snipix_user", JSON.stringify(user));
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem("snipix_token");
    localStorage.removeItem("snipix_user");
    set({ user: null, token: null });
  },

  init: () => {
    const token = localStorage.getItem("snipix_token");
    const userStr = localStorage.getItem("snipix_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token });
      } catch {}
    }
  },
}));