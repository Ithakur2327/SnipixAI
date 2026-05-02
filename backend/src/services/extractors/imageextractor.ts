import Tesseract from "tesseract.js";
import { logger } from "../../config/logger";

export const extractImage = async (imageUrl: string): Promise<{ text: string; pageCount: null }> => {
  logger.info(`Running OCR on: ${imageUrl}`);
  const { data: { text } } = await Tesseract.recognize(imageUrl, "eng");
  return { text: text.trim(), pageCount: null };
};