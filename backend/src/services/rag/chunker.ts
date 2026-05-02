import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { TextChunk } from "../../types";

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export const chunkText = async (
  text:       string,
  documentId: string,
  userId:     string
): Promise<TextChunk[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize:    800,
    chunkOverlap: 100,
    separators:   ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
  });

  const rawChunks = await splitter.splitText(text);

  return rawChunks.map((chunkText, i) => ({
    chunkId:    `${documentId}_${i}`,
    text:       chunkText,
    index:      i,
    tokenCount: estimateTokens(chunkText),
    metadata: {
      documentId,
      userId,
      chunkIndex: i,
      text:       chunkText.slice(0, 1000),
    },
  }));
};

// alias so old imports still work
export const splitIntoChunks = chunkText;