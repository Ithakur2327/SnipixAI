import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  _id: string;
  name: string;
  email: string;
  plan: "free" | "pro";
  usageCount: number;
  usageLimit: number;
}

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        // Keep direct key in sync so axios interceptor always finds it
        if (typeof window !== "undefined") {
          localStorage.setItem("snipix_token", token);
        }
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("snipix_token");
          localStorage.removeItem("snipix-auth");
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "snipix-auth",
      partialize: (state) => ({
        user:            state.user,
        token:           state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);