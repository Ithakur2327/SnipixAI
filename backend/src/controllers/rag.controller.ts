import { Response }          from "express";
import { Document }          from "../models/Document";
import { ChatMessage }       from "../models/ChatMessage";
import { AuthRequest }       from "../types";
import { ok, paginated }     from "../utils/response";
import { AppError }          from "../middleware/errorHandler";
import { queryDocument }     from "../services/rag/pipeline";

export const chat = async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params as { documentId: string };
  const { question, topK } = req.body as { question: string; topK?: number };

  if (!question) throw new AppError("Question is required", 400);

  const doc = await Document.findOne({ _id: documentId, userId: req.user!._id });
  if (!doc) throw new AppError("Document not found", 404);
  if (doc.status !== "ready") throw new AppError("Document not ready", 422);

  // Save user message
  await ChatMessage.create({
    documentId,
    userId:  req.user!._id,
    role:    "user",
    content: question,
    sources: [],
  });

  // Get recent history
  const history = await ChatMessage.find({ documentId, userId: req.user!._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()
    .then((msgs) =>
      msgs.reverse().map((m) => ({ role: m.role, content: m.content }))
    );

  // Query RAG
  const { answer, sources } = await queryDocument(
    documentId,
    req.user!._id.toString(),
    question,
    history,
    topK ?? 5
  );

  // Save assistant message
  const msg = await ChatMessage.create({
    documentId,
    userId:  req.user!._id,
    role:    "assistant",
    content: answer,
    sources: sources.map((s) => ({
    chunkId:   s.chunkId,
    chunkText: s.chunkText, // ✅ FIXED
    score:     s.score,
  }))
  });

  ok(res, {
    messageId:       msg._id.toString(),
    role:            "assistant",
    content:         answer,
    sources:         sources,
    processingTimeMs: 0,
  });
};

export const getChatHistory = async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params as { documentId: string };
  const page  = Number(req.query["page"])  || 1;
  const limit = Number(req.query["limit"]) || 50;
  const skip  = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    ChatMessage.find({ documentId, userId: req.user!._id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ChatMessage.countDocuments({ documentId, userId: req.user!._id }),
  ]);

  paginated(res, messages, total, page, limit);
};

export const clearChat = async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params as { documentId: string };
  await ChatMessage.deleteMany({ documentId, userId: req.user!._id });
  ok(res, { message: "Chat cleared" });
};