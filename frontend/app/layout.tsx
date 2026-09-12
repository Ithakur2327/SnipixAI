import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnipixAI — RAG-Based AI Content Summarizer",
  description: "Summarize PDFs, DOCX, URLs, images and more with AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
          {children}
          
        </div>
      </body>
    </html>
  );
}