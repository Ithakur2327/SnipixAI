import mongoose, { Schema } from "mongoose";
import { ISummary } from "../types";

const SummarySchema = new Schema<ISummary>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    userId:     { type: Schema.Types.ObjectId, ref: "User",     required: true, index: true },

    outputType: {
      type: String,
      enum: ["tldr","bullets","key_insights","action_points","section_summary"],
      required: true,
    },

    content: { type: Schema.Types.Mixed, required: true },

    modelName: { type: String, default: "gpt-4o" }, // ✅ FIXED

    promptTokens:     { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    processingTimeMs: { type: Number, default: 0 },

    tokenUsage: {
      prompt:     { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total:      { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Summary = mongoose.model<ISummary>("Summary", SummarySchema);