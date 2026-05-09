import axios from "axios";
import { SourceType } from "../../types";
import { extractPDF }   from "./pdfextractor";
import { extractDOCX }  from "./docxextractor";
import { extractImage } from "./imageextractor";
import { extractURL }   from "./urlextractor";

interface ExtractResult { text: string; pageCount: number | null; }

export const extractText = async (opts: {
  sourceType: SourceType;
  sourceUrl?: string;
  rawText?: string;
}): Promise<ExtractResult> => {
  const { sourceType, sourceUrl, rawText } = opts;

  if (sourceType === "raw_text") return { text: rawText ?? "", pageCount: null };
  if (sourceType === "url")      return extractURL(sourceUrl!);
  if (sourceType === "image")    return extractImage(sourceUrl!);

  // Download from Cloudinary
  let buffer: Buffer;
  try {
    const { data } = await axios.get<ArrayBuffer>(sourceUrl!, { responseType: "arraybuffer" });
    buffer = Buffer.from(data);
  } catch (err: any) {
    if (err.response?.status === 401) {
      throw new Error("Cloudinary authentication failed. Please check your Cloudinary credentials in the .env file.");
    }
    if (err.response?.status === 404) {
      throw new Error("Uploaded file not found in Cloudinary. The file may have been deleted or the upload failed.");
    }
    throw new Error(`Failed to download file from Cloudinary: ${err.message}`);
  }

  switch (sourceType) {
    case "pdf":  return extractPDF(buffer);
    case "docx": return extractDOCX(buffer);
    case "txt":  return { text: buffer.toString("utf-8").trim(), pageCount: null };
    case "ppt":  return extractDOCX(buffer); // mammoth handles some pptx
    default:     throw new Error(`Unsupported: ${sourceType}`);
  }
};