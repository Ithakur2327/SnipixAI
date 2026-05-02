import Navbar from "@/components/shared/Navbar";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0F0F14" }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: "64px" }}>
        {children}
      </main>
    </div>
  );
}