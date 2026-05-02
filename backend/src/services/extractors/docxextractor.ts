import mammoth from "mammoth";

export const extractDOCX = async (buffer: Buffer): Promise<{ text: string; pageCount: null }> => {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value.trim(), pageCount: null };
};