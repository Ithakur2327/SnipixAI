import { Response } from "express";
import { Document }              from "../models/Document";
import { Summary }               from "../models/Summary";
import { summarizeDocument }     from "../services/rag/pipeline";
import { ok }                    from "../utils/response";
import { AppError }              from "../middleware/errorHandler";
import { AuthRequest, OutputType } from "../types";

export const createSummary = async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  const { outputType } = req.body as { outputType: OutputType };

  // Check document belongs to user and is ready
  const doc = await Document.findOne({ _id: documentId, userId: req.user!._id });
  if (!doc)                   throw new AppError("Document not found", 404);
  if (doc.status !== "ready") throw new AppError("Document is still processing", 409, "NOT_READY");
  if (!doc.rawText)           throw new AppError("Document has no extracted text", 422);

  // Check if summary already exists for this outputType
  const existing = await Summary.findOne({ documentId, outputType });
  if (existing) return ok(res, existing.toObject());

  const result = await summarizeDocument({ documentId, rawText: doc.rawText, outputType });

  const summary = await Summary.create({
    documentId,
    userId:    req.user!._id,
    outputType,
    ...result,
  });

  // Increment summary count
  await Document.findByIdAndUpdate(documentId, { $inc: { summaryCount: 1 } });

  ok(res, summary.toObject(), 201);
};

export const listSummaries = async (req: AuthRequest, res: Response) => {
  const summaries = await Summary.find({
    documentId: req.params.documentId,
    userId:     req.user!._id,
  }).sort({ createdAt: -1 });
  ok(res, summaries);
};

export const deleteSummary = async (req: AuthRequest, res: Response) => {
  const summary = await Summary.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  if (!summary) throw new AppError("Summary not found", 404);
  ok(res, { message: "Summary deleted" });
};