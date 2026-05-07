"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Force reflow to restart animation on every route change
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "";
  }, [pathname]);

  return (
    <>
      <style>{`
        @keyframes snx-page-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .snx-transition-root {
          animation: snx-page-in 0.45s ease-out both;
          will-change: opacity;
        }
      `}</style>
      <div ref={ref} className="snx-transition-root">
        {children}
      </div>
    </>
  );
}