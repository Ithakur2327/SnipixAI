"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  {
    label: "Home",
    href: "/",
    scroll: false,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "About",
    href: "/",
    scroll: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Library",
    href: "/library",
    scroll: false,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M4 19V5a1 1 0 0 1 1-1h5v16H5a1 1 0 0 1-1-1Zm10 0V4a1 1 0 0 1 1-1h5v16h-5a1 1 0 0 1-1-1Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [active,       setActive]       = useState("Home");
  const [manualActive, setManualActive] = useState<string | null>(null);
  const [currentHash,  setCurrentHash]  = useState("");
  const [scrolled,     setScrolled]     = useState(false);

  // active sync
  useEffect(() => {
    if (manualActive) { setActive(manualActive); return; }
    if (pathname === "/" && currentHash === "#about") { setActive("About"); return; }
    if (pathname.startsWith("/library")) setActive("Library");
    else setActive("Home");
  }, [pathname, manualActive, currentHash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const fn = () => setCurrentHash(window.location.hash || "");
    fn();
    window.addEventListener("hashchange", fn, { passive: true });
    return () => window.removeEventListener("hashchange", fn);
  }, []);

  useEffect(() => {
    if (manualActive && pathname !== "/") {
      const t = setTimeout(() => setManualActive(null), 600);
      return () => clearTimeout(t);
    }
  }, [pathname, manualActive]);

  const handleNav = (link: typeof LINKS[0]) => {
    setManualActive(link.label);
    if (link.scroll) {
      setCurrentHash("#about");
      if (pathname !== "/") {
        router.push("/");
        setTimeout(() => {
          document
            .getElementById("about")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 450);
      } else {
        window.location.hash = "#about";
        document
          .getElementById("about")
          ?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (link.href === "/" && pathname === "/") {
      window.history.replaceState(null, "", "/");
      setCurrentHash("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push(link.href);
  };

  return (
    <>
      <style>{`
        /* ── fixed ── */
        .snx-nav {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 999999 !important;
          height: 64px;
          transform-origin: top center;
          transition:
            background   0.25s ease,
            box-shadow   0.25s ease,
            border-color 0.25s ease,
            transform    0.25s ease;
        }

        /* ── pill buttons: NO box on hover, only bright ── */
        .snx-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 15px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.1px;
          cursor: pointer;
          background: transparent;
          border: none;
          outline: none;
          color: rgba(255,255,255,0.62);
          font-family: var(--font-inter), sans-serif;
          white-space: nowrap;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .snx-pill:hover {
          color: rgba(255,255,255,0.95);
          background: transparent;
        }
        .snx-pill.active {
          color: #fff;
          font-weight: 600;
          background: transparent;
        }

        /* ── cta ── */
        .snx-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 38px;
          padding: 0 22px;
          border-radius: 10px;
          background: #E8590A;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          font-family: var(--font-inter), sans-serif;
          outline: none;
          opacity: 0.75;
          transition:
            opacity   0.2s ease,
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }
        .snx-cta:hover {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(232,89,10,0.35);
        }
        .snx-cta:active { transform: scale(0.97); }

        /* ── logo brand ── */
        .snx-brand {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          outline: none;
          transition: opacity 0.18s ease;
        }
        .snx-brand:hover { opacity: 0.8; }

        html { scroll-behavior: smooth; }
      `}</style>

      <nav
        className="snx-nav"
        style={{
          background:           scrolled ? "rgba(15,15,20,0.92)" : "rgba(15,15,20,0.72)",
          backdropFilter:       "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom:         scrolled ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.06)",
          transform:            scrolled ? "scaleY(0.94)" : "scaleY(1)",
          boxShadow:            scrolled ? "0 24px 60px rgba(0,0,0,0.18)" : "none",
        }}
      >
        <div
          style={{
            maxWidth:       "1280px",
            margin:         "0 auto",
            height:         "64px",
            padding:        "0 32px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            position:       "relative",
          }}
        >
          {/* ── LOGO ── */}
          <button
            className="snx-brand"
            onClick={() => handleNav(LINKS[0])}
          >
            <span
              style={{
                fontFamily:    "var(--font-raleway), sans-serif",
                fontSize:      "20px",
                fontWeight:    700,
                color:         "#fff",
                letterSpacing: "1.5px",
                textTransform: "none",
                lineHeight:    1,
              }}
            >
              Snipix<span style={{ color: "#E8590A" }}>AI</span>
            </span>
          </button>

          {/* ── CENTER PILL — always visible, no scroll hide ── */}
          <div
            style={{
              position:    "absolute",
              left:        "50%",
              top:         "50%",
              transform:   "translate(-50%, -50%)",
              display:     "flex",
              alignItems:  "center",
              gap:         "2px",
              background:  "rgba(255,255,255,0.06)",
              border:      "1px solid rgba(255,255,255,0.09)",
              borderRadius:"14px",
              padding:     "5px 6px",
            }}
          >
            {LINKS.map((link, i) => (
              <span key={link.label} style={{ display: "contents" }}>
                {i > 0 && (
                  <div
                    style={{
                      width:      "1px",
                      height:     "15px",
                      background: "rgba(255,255,255,0.10)",
                      margin:     "0 3px",
                      flexShrink: 0,
                    }}
                  />
                )}
                <button
                  onClick={() => handleNav(link)}
                  className={
                    active === link.label ? "snx-pill active" : "snx-pill"
                  }
                >
                  {link.icon}
                  {link.label}
                </button>
              </span>
            ))}
          </div>

          {/* ── CTA — always visible ── */}
          <button
            className="snx-cta"
            onClick={() => router.push("/login")}
          >
            Get Started
          </button>
        </div>
      </nav>
    </>
  );
}