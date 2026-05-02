import mongoose, { Schema } from "mongoose";
import { IDocument } from "../types";

const DocumentSchema = new Schema<IDocument>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:        { type: String, required: true, trim: true },
    sourceType:   {
      type: String,
      enum: ["pdf","docx","ppt","txt","url","image","raw_text"],
      required: true,
    },
    sourceUrl:    { type: String, default: null },
    cloudinaryId: { type: String, default: null },
    rawText:      { type: String, default: "" },
    wordCount:    { type: Number, default: 0 },
    pageCount:    { type: Number, default: null },
    summaryCount: { type: Number, default: 0 },
    status:       {
      type: String,
      enum: ["pending","extracting","ready","failed"],
      default: "pending",
    },
    metadata: {
      originalName: { type: String, default: "" },
      mimeType:     { type: String, default: "" },
      fileSize:     { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Document = mongoose.model<IDocument>("Document", DocumentSchema);