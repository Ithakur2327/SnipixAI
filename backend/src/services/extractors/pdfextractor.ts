import pdfParse from "pdf-parse";

export const extractPDF = async (buffer: Buffer): Promise<{ text: string; pageCount: number }> => {
  const data = await pdfParse(buffer);
  return { text: data.text.trim(), pageCount: data.numpages };
};