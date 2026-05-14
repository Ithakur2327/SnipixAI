"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const LINKS = [
  {
    label: "Home",
    href: "/",
    scroll: false,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "About",
    href: "/",
    scroll: true,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M4 19V5a1 1 0 0 1 1-1h5v16H5a1 1 0 0 1-1-1Zm10 0V4a1 1 0 0 1 1-1h5v16h-5a1 1 0 0 1-1-1Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();

  const { user, isAuthenticated, logout } = useAppStore();

  const [active,      setActive]      = useState("Home");
  const [currentHash, setCurrentHash] = useState("");
  const [scrolled,    setScrolled]    = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);

  useEffect(() => {
    const updateState = () => {
      setScrolled(window.scrollY > 24);
      if (window.location.pathname === "/") {
        const aboutSection = document.getElementById("about");
        if (aboutSection) {
          const rect = aboutSection.getBoundingClientRect();
          if (rect.top <= 96 && rect.bottom > 96) {
            setCurrentHash("#about");
            return;
          }
        }
        if (window.scrollY < 56) setCurrentHash("");
      }
    };
    updateState();
    window.addEventListener("scroll", updateState, { passive: true });
    return () => window.removeEventListener("scroll", updateState);
  }, []);

  useEffect(() => {
    const fn = () => setCurrentHash(window.location.hash || "");
    fn();
    window.addEventListener("hashchange", fn, { passive: true });
    return () => window.removeEventListener("hashchange", fn);
  }, []);

  useEffect(() => {
    if (pathname === "/" && currentHash === "#about") { setActive("About"); return; }
    if (pathname.startsWith("/library"))              { setActive("Library"); return; }
    setActive("Home");
  }, [pathname, currentHash]);

  useEffect(() => {
    if (!dropOpen) return;
    const fn = () => setDropOpen(false);
    window.addEventListener("click", fn);
    return () => window.removeEventListener("click", fn);
  }, [dropOpen]);

  const handleNav = (link: (typeof LINKS)[0]) => {
    if (link.scroll) {
      if (pathname !== "/") {
        router.push("/#about");
        setTimeout(() => {
          document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
        }, 480);
      } else {
        document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", "/#about");
        setCurrentHash("#about");
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

  const handleLogout = () => {
    logout();
    router.push("/");
    setDropOpen(false);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hachen&display=swap');`}</style>
      <style>{`
        .snx-nav {
          position: fixed !important;
          top: 0 !important; left: 0 !important; right: 0 !important;
          z-index: 999999 !important;
          height: 64px;
          transform-origin: top center;
          transition:
            background    0.35s ease-out,
            box-shadow    0.4s ease-out,
            border-color  0.35s ease-out,
            transform     0.45s cubic-bezier(0.25,0.46,0.45,0.94),
            border-radius 0.4s ease-out,
            margin        0.4s ease-out;
        }

        .snx-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 9px;
          font-size: 13px; font-weight: 500; letter-spacing: -0.1px;
          cursor: pointer; background: transparent; border: none; outline: none;
          color: rgba(255,255,255,0.50);
          font-family: var(--font-inter), sans-serif;
          white-space: nowrap;
          transition: color 0.15s ease;
        }
        .snx-pill:hover { color: rgba(255,255,255,0.92); }
        .snx-pill.active { color: #fff; font-weight: 600; }
        .snx-pill .pill-icon { opacity: 0.55; transition: opacity 0.15s ease; }
        .snx-pill:hover .pill-icon  { opacity: 0.85; }
        .snx-pill.active .pill-icon { opacity: 1; }

        .snx-pill-wrap { position: relative; display: inline-flex; align-items: center; }
        .snx-pill-wrap .snx-active-bar { display: none !important; }
        .snx-pill-wrap.active .snx-active-bar { display: none !important; }

        /* ── CTA (Get Started) — F7374F theme ── */
        .snx-cta {
          display: inline-flex; align-items: center; justify-content: center;
          height: 36px; padding: 0 20px; border-radius: 10px;
          background: #F7374F; color: #fff; font-size: 13px; font-weight: 600;
          border: none; cursor: pointer;
          font-family: var(--font-inter), sans-serif; outline: none;
          transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 0 16px rgba(247,55,79,0.3);
        }
        .snx-cta:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(247,55,79,0.4); }
        .snx-cta:active { transform: scale(0.97); }

        .snx-brand { background: none; border: none; cursor: pointer; padding: 0; outline: none; transition: opacity 0.18s ease; }
        .snx-brand:hover { opacity: 0.75; }

        /* ── Avatar — circle style like image, F7374F theme ── */
        .snx-avatar {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 4px 10px 4px 4px; border-radius: 100px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer; outline: none;
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.15s ease;
        }
        .snx-avatar:hover {
          background: rgba(247,55,79,0.08);
          border-color: rgba(247,55,79,0.25);
          transform: translateY(-1px);
        }
        .snx-avatar:active { transform: scale(0.97); }

        /* Circle avatar icon — matches the image */
        .snx-avatar-icon {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: white; letter-spacing: 0.3px;
          font-family: var(--font-inter), sans-serif; flex-shrink: 0;
          transition: background 0.18s, border-color 0.18s;
        }
        .snx-avatar:hover .snx-avatar-icon {
          background: rgba(247,55,79,0.18);
          border-color: rgba(247,55,79,0.4);
        }

        .snx-avatar-name {
          font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,0.8);
          font-family: var(--font-inter), sans-serif;
          max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .snx-avatar-chevron {
          margin-left: 2px; color: rgba(255,255,255,0.3);
          transition: transform 0.2s ease, color 0.15s ease; flex-shrink: 0;
        }
        .snx-avatar:hover .snx-avatar-chevron { color: rgba(255,255,255,0.6); }
        .snx-avatar-chevron.open { transform: rotate(180deg); }

        /* ── Dropdown — F7374F theme ── */
        .snx-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0;
          background: #050505; border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px; padding: 5px; min-width: 210px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2);
          z-index: 100;
          animation: dropIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        .snx-drop-header {
          padding: 10px 10px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 4px;
        }
        .snx-drop-item {
          display: flex; align-items: center; gap: 9px; width: 100%;
          padding: 9px 10px; border-radius: 9px; border: none; background: transparent;
          cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.65);
          transition: background 0.13s ease, color 0.13s ease;
          font-family: var(--font-inter), sans-serif; text-align: left;
        }
        .snx-drop-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .snx-drop-item .item-icon { opacity: 0.5; flex-shrink: 0; transition: opacity 0.13s ease; }
        .snx-drop-item:hover .item-icon { opacity: 1; }
        .snx-drop-item.danger { color: rgba(255,255,255,0.5); }
        .snx-drop-item.danger:hover { background: rgba(247,55,79,0.1); color: #F7374F; }
        .snx-drop-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0; }

        /* Plan badge */
        .snx-plan-badge {
          background: rgba(247,55,79,0.1);
          border: 1px solid rgba(247,55,79,0.22);
          border-radius: 6px; padding: 2px 7px;
        }

        @media (max-width: 980px) {
          .snx-nav { height: auto !important; min-height: 64px; }
          .snx-nav-inner { padding: 0 18px !important; }
          .snx-pill-container {
            position: relative !important;
            left: auto !important; top: auto !important;
            transform: none !important;
            width: auto !important;
            margin: 0 auto !important;
            flex-wrap: wrap;
            justify-content: center;
            padding: 6px 8px !important;
            gap: 6px !important;
          }
          .snx-pill { padding: 8px 10px; font-size: 12px; }
          .snx-pill-wrap { margin: 0 1px; }
          .snx-cta { height: 34px; padding: 0 16px; font-size: 12px; }
          .snx-avatar { padding: 4px 8px 4px 4px; }
          .snx-avatar-name { display: none; }
          .snx-dropdown { right: 6px; min-width: 180px; }
          .snx-right-wrap { justify-content: flex-end; }
        }

        @media (max-width: 680px) {
          .snx-nav { padding: 10px 0 !important; }
          .snx-nav-inner {
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: center !important;
            gap: 10px !important;
          }
          .snx-brand { align-self: center; }
          .snx-pill-container { background: rgba(255,255,255,0.04) !important; width: 100% !important; }
          .snx-right-wrap { width: 100%; justify-content: space-between; }
          .snx-dropdown { right: 0; left: auto; min-width: calc(100% - 24px); }
        }
      `}</style>

      <nav
        className="snx-nav"
        style={{
          background:           scrolled ? "linear-gradient(180deg,rgba(15,15,18,0.26) 0%,rgba(10,10,12,0.28) 100%)" : "linear-gradient(180deg,rgba(15,15,18,0.16) 0%,rgba(10,10,12,0.20) 100%)",
          backdropFilter:       scrolled ? "blur(36px) saturate(180%)" : "blur(28px) saturate(170%)",
          WebkitBackdropFilter: scrolled ? "blur(36px) saturate(180%)" : "blur(28px) saturate(170%)",
          borderBottom:         scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.04)",
          transform:            scrolled ? "scaleX(0.96)" : "scaleX(1)",
          borderRadius:         scrolled ? "20px" : "0px",
          margin:               scrolled ? "12px 16px" : "0",
          boxShadow:            scrolled ? "0 22px 70px rgba(0,0,0,0.28),inset 0 0 0 1px rgba(255,255,255,0.05)" : "none",
          border:               scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.03)",
        }}
      >
        <div className="snx-nav-inner" style={{
          maxWidth: "1280px", margin: "0 auto", height: "64px",
          padding: "0 32px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "relative",
        }}>

          {/* LOGO */}
          <button className="snx-brand" onClick={() => handleNav(LINKS[0])}>
            <span style={{
              fontFamily: "'Hachen', var(--font-raleway), sans-serif",
              fontSize: "20px", fontWeight: 700, color: "#fff",
              letterSpacing: "1.5px", lineHeight: 1,
            }}>
              Snipix<span style={{ color: "#F7374F" }}>AI</span>
            </span>
          </button>

          {/* CENTER PILL NAV */}
          <div className="snx-pill-container" style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%,-50%)",
            display: "flex", alignItems: "center", gap: "2px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "13px", padding: "4px 5px",
          }}>
            {LINKS.map((link, i) => (
              <span key={link.label} style={{ display: "contents" }}>
                {i > 0 && (
                  <div style={{
                    width: "1px", height: "14px",
                    background: "rgba(255,255,255,0.09)", margin: "0 2px", flexShrink: 0,
                  }} />
                )}
                <span className={`snx-pill-wrap${active === link.label ? " active" : ""}`}>
                  <button
                    onClick={() => handleNav(link)}
                    className={active === link.label ? "snx-pill active" : "snx-pill"}
                  >
                    <span className="pill-icon">{link.icon}</span>
                    {link.label}
                  </button>
                  <span className="snx-active-bar" />
                </span>
              </span>
            ))}
          </div>

          {/* RIGHT SIDE */}
          <div className="snx-right-wrap" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isAuthenticated && user ? (
              <div style={{ position: "relative" }}>
                <button
                  className="snx-avatar"
                  onClick={(e) => { e.stopPropagation(); setDropOpen((v) => !v); }}
                  title={user.name}
                >
                  {/* Circle avatar — person icon style matching screenshot */}
                  <span className="snx-avatar-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span className="snx-avatar-name">{user.name.split(" ")[0]}</span>
                  <svg className={`snx-avatar-chevron${dropOpen ? " open" : ""}`}
                    width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {dropOpen && (
                  <div className="snx-dropdown" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="snx-drop-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "50%",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(247,55,79,0.3)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8"/>
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", fontFamily: "var(--font-inter),sans-serif", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.name}
                          </p>
                          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginTop: "2px", fontFamily: "var(--font-inter),sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.email}
                          </p>
                        </div>
                        <div className="snx-plan-badge" style={{ marginLeft: "auto", flexShrink: 0 }}>
                          <span style={{ fontSize: "9.5px", color: "#F7374F", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", fontFamily: "var(--font-inter),sans-serif" }}>
                            {user.plan}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button className="snx-drop-item" onClick={() => { router.push("/dashboard"); setDropOpen(false); }}>
                      <span className="item-icon">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
                          <rect x="8" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
                          <rect x="1" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
                          <rect x="8" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
                        </svg>
                      </span>
                      Dashboard
                    </button>

                    <button className="snx-drop-item" onClick={() => { router.push("/library"); setDropOpen(false); }}>
                      <span className="item-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M4 19V5a1 1 0 0 1 1-1h5v16H5a1 1 0 0 1-1-1Zm10 0V4a1 1 0 0 1 1-1h5v16h-5a1 1 0 0 1-1-1Z"
                            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      Library
                    </button>

                    <div className="snx-drop-divider" />

                    <button className="snx-drop-item danger" onClick={handleLogout}>
                      <span className="item-icon">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2M9 10l3-3-3-3M12 7H5"
                            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="snx-cta" onClick={() => router.push("/login")}>
                Get Started
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}