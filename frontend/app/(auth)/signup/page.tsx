"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 7: wire to POST /auth/signup
    console.log("Register:", { email, password, confirmPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
         style={{ background: "#070810" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(232,89,10,0.14), transparent 28%), radial-gradient(circle at bottom left, rgba(232,89,10,0.08), transparent 24%)" }} />
      <div style={{ position: "absolute", top: "18%", left: "50%", width: "380px", height: "380px", transform: "translateX(-50%)", background: "rgba(232,89,10,0.05)", filter: "blur(110px)", pointerEvents: "none" }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black" style={{ color: "#FFFFFF" }}>Create your account</h1>
          <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.7)" }}>Start your SnipixAI journey with a free account</p>
        </div>

        <div className="rounded-[32px] p-10" style={{ background: "rgba(11,12,20,0.90)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(24px)" }}>
          <form onSubmit={handleSignup} className="flex flex-col gap-6">
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
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
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
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(255,255,255,0.72)" }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-5 py-4 rounded-[28px] text-sm border outline-none transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(232,89,10,0.7)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 rounded-[28px] text-sm font-semibold"
              style={{ background: "#E8590A", color: "#ffffff", border: "1px solid rgba(232,89,10,0.35)" }}
            >
              Create account
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.65)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "#E8590A" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
