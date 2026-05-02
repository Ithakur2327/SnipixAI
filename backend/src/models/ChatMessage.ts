import mongoose, { Schema } from "mongoose";
import { IChatMessage } from "../types";

const SourceSchema = new Schema(
  { chunkId: String, chunkText: String, score: Number },
  { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    userId:     { type: Schema.Types.ObjectId, ref: "User",     required: true },
    role:       { type: String, enum: ["user", "assistant"],    required: true },
    content:    { type: String,                                  required: true },
    sources:    { type: [SourceSchema],                          default: []   },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ documentId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);