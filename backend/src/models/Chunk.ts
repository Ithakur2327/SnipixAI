import mongoose, { Schema } from "mongoose";
import { IChunk } from "../types";

const ChunkSchema = new Schema<IChunk>(
  {
    documentId:     { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    userId:         { type: Schema.Types.ObjectId, ref: "User",     required: true },
    chunkIndex:     { type: Number, required: true },
    text:           { type: String, required: true },
    tokenCount:     { type: Number, default: 0 },
    vectorId:       { type: String, default: "" },
    embeddingModel: { type: String, default: "text-embedding-3-small" },
  },
  { timestamps: true }
);

export const Chunk = mongoose.model<IChunk>("Chunk", ChunkSchema);