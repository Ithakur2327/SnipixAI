import { Response }              from "express";
import { Document }              from "../models/Document";
import { AuthRequest, SourceType } from "../types";
import { ok, paginated }         from "../utils/response";
import { AppError }              from "../middleware/errorHandler";
import { processDocument }       from "../services/rag/pipeline";
import {cloudinary}         from "../config/cloudinary";

// Upload file
export const uploadFile = async (req: AuthRequest, res: Response) => {
  const file = req.file as any;
  if (!file) throw new AppError("No file uploaded", 400);

  const sourceType = (req.body.sourceType as SourceType) || "pdf";
  const title      = (req.body.title as string) || file.originalname;

  const doc = await Document.create({
    userId:     req.user!._id,
    title,
    sourceType,
    sourceUrl:  file.path || null,
    cloudinaryId: file.filename || null,
    rawText:    "",
    wordCount:  0,
    pageCount:  null,
    status:     "extracting",
    metadata: {
      originalName: file.originalname,
      mimeType:     file.mimetype,
      fileSize:     file.size,
    },
  });

  await (req.user as any).updateOne({ $inc: { usageCount: 1 } });

  setImmediate(() => {
    processDocument(doc._id.toString(), req.user!._id.toString()).catch(console.error);
  });

  ok(res, { documentId: doc._id.toString(), status: "extracting" }, 202);
};

// Submit URL
export const submitUrl = async (req: AuthRequest, res: Response) => {
  const { url, title } = req.body as { url: string; title?: string };
  if (!url) throw new AppError("URL is required", 400);

  const doc = await Document.create({
    userId:      req.user!._id,
    title:       title || url,
    sourceType:  "url",
    sourceUrl:   url,
    cloudinaryId: null,
    rawText:     "",
    wordCount:   0,
    pageCount:   null,
    status:      "extracting",
    metadata:    { originalName: url, mimeType: "text/html", fileSize: 0 },
  });

  await (req.user as any).updateOne({ $inc: { usageCount: 1 } });

  setImmediate(() => {
    processDocument(doc._id.toString(), req.user!._id.toString()).catch(console.error);
  });

  ok(res, { documentId: doc._id.toString(), status: "extracting" }, 202);
};

// Submit raw text
export const submitText = async (req: AuthRequest, res: Response) => {
  const { text, title } = req.body as { text: string; title?: string };
  if (!text) throw new AppError("Text is required", 400);

  const doc = await Document.create({
    userId:      req.user!._id,
    title:       title || "Raw text",
    sourceType:  "raw_text",
    sourceUrl:   null,
    cloudinaryId: null,
    rawText:     text,
    wordCount:   text.split(/\s+/).filter(Boolean).length,
    pageCount:   null,
    status:      "extracting",
    metadata:    { originalName: "raw_text", mimeType: "text/plain", fileSize: text.length },
  });

  await (req.user as any).updateOne({ $inc: { usageCount: 1 } });

  setImmediate(() => {
    processDocument(doc._id.toString(), req.user!._id.toString()).catch(console.error);
  });

  ok(res, { documentId: doc._id.toString(), status: "extracting" }, 202);
};

// List documents
export const listDocuments = async (req: AuthRequest, res: Response) => {
  const page  = Number(req.query["page"])  || 1;
  const limit = Number(req.query["limit"]) || 20;
  const skip  = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Document.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Document.countDocuments({ userId: req.user!._id }),
  ]);

  paginated(res, docs, total, page, limit);
};

// Get single document
export const getDocument = async (req: AuthRequest, res: Response) => {
  const doc = await Document.findOne({
    _id:    req.params["id"],
    userId: req.user!._id,
  });
  if (!doc) throw new AppError("Document not found", 404);
  ok(res, { document: doc });
};

// Get document status
export const getDocumentStatus = async (req: AuthRequest, res: Response) => {
  const doc = await Document.findOne({
    _id:    req.params["id"],
    userId: req.user!._id,
  }).select("status");
  if (!doc) throw new AppError("Document not found", 404);
  ok(res, { documentId: req.params["id"], status: doc.status, progress: doc.status === "ready" ? 100 : 50 });
};

// Delete document
export const deleteDocument = async (req: AuthRequest, res: Response) => {
  const doc = await Document.findOne({
    _id:    req.params["id"],
    userId: req.user!._id,
  });
  if (!doc) throw new AppError("Document not found", 404);

  if ((doc as any).cloudinaryId) {
    await (cloudinary as any).uploader.destroy((doc as any).cloudinaryId);
  }

  await Document.deleteOne({ _id: doc._id.toString() });
  ok(res, { message: "Document deleted" });
};