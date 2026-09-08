import logging
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def chunk_text(
    text: str,
    document_id: str,
    user_id: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> List[dict]:
    settings = get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size or settings.chunk_size,
        chunk_overlap=chunk_overlap or settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
    )

    raw_chunks = splitter.split_text(text)

    chunks = []
    for i, piece in enumerate(raw_chunks):
        token_count = max(1, len(piece) // 4)
        chunks.append(
            {
                "chunk_id": f"{document_id}_{i}",
                "text": piece,
                "index": i,
                "token_count": token_count,
                "metadata": {
                    "documentId": document_id,
                    "userId": user_id,
                    "chunkIndex": i,
                    "text": piece[:1000],
                },
            }
        )

    logger.info("[chunker] Created %d chunks for doc %s", len(chunks), document_id)
    return chunks
