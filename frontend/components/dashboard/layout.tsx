import Navbar from "@/components/shared/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F0F14",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />
      <main
        className="snx-page"
        style={{
          flex: 1,
          paddingTop: "64px",
          overflowY: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}