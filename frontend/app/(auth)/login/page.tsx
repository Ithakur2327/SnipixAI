"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

export default function LoginPage() {
  const router   = useRouter();
  const setAuth  = useAppStore((s) => s.setAuth);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data.data.user, data.data.token);
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#000000" }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top left, rgba(232,89,10,0.16), transparent 28%), radial-gradient(circle at bottom right, rgba(232,89,10,0.08), transparent 24%)" }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black" style={{ color: "#FFFFFF" }}>
            Welcome back
          </h1>
          <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.7)" }}>
            Sign in to your SnipixAI account
          </p>
        </div>

        <div
          className="rounded-[32px] p-10"
          style={{ background: "rgba(11,12,20,0.90)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(24px)" }}
        >
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(232,89,10,0.12)", border: "1px solid rgba(232,89,10,0.3)", color: "#E8590A" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.72)" }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-5 py-4 rounded-[28px] text-sm border outline-none transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(232,89,10,0.7)")}
                onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.72)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-5 py-4 rounded-[28px] text-sm border outline-none transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(232,89,10,0.7)")}
                onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-[28px] text-sm font-semibold transition-opacity"
              style={{ background: "#E8590A", color: "#ffffff", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.65)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold" style={{ color: "#E8590A" }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}