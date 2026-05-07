import type { Metadata } from "next";
import "./globals.css";
import PageTransition from "@/components/shared/PageTransition";

export const metadata: Metadata = {
  title: "SnipixAI — RAG-Based AI Content Summarizer",
  description: "Summarize PDFs, DOCX, URLs, images and more with AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "var(--font-inter),'Segoe UI',sans-serif",
          margin: 0,
          padding: 0,
          overflowX: "hidden",
        }}
      >
        <div className="snx-page-wrap">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}