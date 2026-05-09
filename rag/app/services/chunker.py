import logging
from typing import List
from langchain.text_splitter import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)


def chunk_text(
    text: str,
    document_id: str,
    user_id: str,
    chunk_size: int = 800,
    chunk_overlap: int = 100,
) -> List[dict]:
    """
    Split text into overlapping chunks.
    Returns list of chunk dicts.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
    )

    raw_chunks = splitter.split_text(text)

    chunks = []
    for i, chunk_text in enumerate(raw_chunks):
        token_count = max(1, len(chunk_text) // 4)  # rough estimate
        chunks.append({
            "chunk_id":   f"{document_id}_{i}",
            "text":       chunk_text,
            "index":      i,
            "token_count": token_count,
            "metadata": {
                "documentId": document_id,
                "userId":     user_id,
                "chunkIndex": i,
                "text":       chunk_text[:1000],
            },
        })

    logger.info(f"[chunker] Created {len(chunks)} chunks for doc {document_id}")
    return chunks