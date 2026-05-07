import Navbar from "@/components/shared/Navbar";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#000000" }}>
      <Navbar />
      <style>{`
        @keyframes lib-page-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lib-page-root {
          animation: lib-page-in 0.48s cubic-bezier(0.22,1,0.36,1) both;
        }
      `}</style>
      <main style={{ flex: 1, paddingTop: "64px" }} className="lib-page-root">
        {children}
      </main>
    </div>
  );
}