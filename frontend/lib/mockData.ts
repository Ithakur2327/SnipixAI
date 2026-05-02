import { Document, Summary, ChatMessage } from "@/types";

export const MOCK_DOCUMENTS: Document[] = [
  {
    _id: "doc1",
    title: "Q3 Financial Report 2024.pdf",
    sourceType: "pdf",
    status: "ready",
    wordCount: 4200,
    pageCount: 18,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    summaryCount: 3,
    sourceUrl: null,
  },
  {
    _id: "doc2",
    title: "Product Roadmap 2025.docx",
    sourceType: "docx",
    status: "ready",
    wordCount: 2100,
    pageCount: 8,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    summaryCount: 2,
    sourceUrl: null,
  },
  {
    _id: "doc3",
    title: "techcrunch.com/ai-trends-2025",
    sourceType: "url",
    status: "ready",
    wordCount: 1800,
    pageCount: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    summaryCount: 1,
    sourceUrl: "https://techcrunch.com",
  },
  {
    _id: "doc4",
    title: "Sales Deck Q4 2024.pptx",
    sourceType: "ppt",
    status: "extracting",
    wordCount: 0,
    pageCount: null,
    createdAt: new Date().toISOString(),
    summaryCount: 0,
    sourceUrl: null,
  },
];

export const MOCK_SUMMARY: Summary = {
  summaryId: "sum1",
  documentId: "doc1",
  outputType: "bullets",
  content: [
    "Revenue grew 23% YoY driven by enterprise segment expansion",
    "Customer churn decreased significantly from 8% down to 5.2%",
    "Three new product launches are scheduled for Q4 2024",
    "APAC region showed 41% growth, becoming second largest market",
    "Operating margin improved to 18.4% due to efficiency gains",
  ],
  model: "gpt-4o",
  processingTimeMs: 2340,
};

export const MOCK_CHAT: ChatMessage[] = [
  {
    _id: "m1",
    role: "assistant",
    content:
      "Document ready. I've indexed 42 chunks from your Q3 Financial Report. Ask me anything about it.",
    sources: [],
    createdAt: new Date().toISOString(),
  },
  {
    _id: "m2",
    role: "user",
    content: "What are the key risks mentioned in this report?",
    sources: [],
    createdAt: new Date().toISOString(),
  },
  {
    _id: "m3",
    role: "assistant",
    content:
      "The report identifies 3 key risks: (1) supply chain disruption in APAC affecting 12% of revenue, (2) currency fluctuation impacting LATAM by ~$2.3M, and (3) upcoming EU regulatory changes requiring compliance investment of $800K.",
    sources: [
      { chunkId: "c1", chunkText: "Supply chain risks remain elevated...", score: 0.93 },
      { chunkId: "c2", chunkText: "Currency exposure in LATAM markets...", score: 0.88 },
    ],
    createdAt: new Date().toISOString(),
  },
];