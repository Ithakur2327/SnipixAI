import logging
from typing import List, Optional
from app.core.pinecone_client import get_pinecone_index

logger = logging.getLogger(__name__)

BATCH_SIZE = 100


def upsert_chunks(chunks: List[dict]) -> int:
    """Upsert embedded chunks to Pinecone."""
    index = get_pinecone_index()
    if index is None:
        logger.warning("[vector_store] Pinecone not available, skipping upsert")
        return 0

    vectors = [
        {
            "id":       c["chunk_id"],
            "values":   c["vector"],
            "metadata": c["metadata"],
        }
        for c in chunks
        if c.get("vector")
    ]

    total = 0
    for i in range(0, len(vectors), BATCH_SIZE):
        batch = vectors[i : i + BATCH_SIZE]
        index.upsert(vectors=batch)
        total += len(batch)
        logger.info(f"[vector_store] Upserted {len(batch)} vectors")

    return total


def similarity_search(
    query_vector: List[float],
    document_id: str,
    user_id: str,
    top_k: int = 5,
) -> List[dict]:
    """Search for similar chunks in Pinecone."""
    index = get_pinecone_index()
    if index is None:
        logger.warning("[vector_store] Pinecone not available")
        return []

    results = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        filter={
            "documentId": {"$eq": document_id},
            "userId":     {"$eq": user_id},
        },
    )

    return [
        {
            "chunk_id":   m["id"],
            "score":      round(m.get("score", 0), 4),
            "text":       m.get("metadata", {}).get("text", ""),
        }
        for m in results.get("matches", [])
    ]


def delete_document_vectors(document_id: str) -> None:
    """Delete all vectors for a document."""
    index = get_pinecone_index()
    if index is None:
        return
    try:
        index.delete(filter={"documentId": {"$eq": document_id}})
        logger.info(f"[vector_store] Deleted vectors for doc: {document_id}")
    except Exception as e:
        logger.error(f"[vector_store] Delete error: {e}")