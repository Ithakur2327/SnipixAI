import logging
from typing import List

from app.core.pinecone_client import get_pinecone_index

logger = logging.getLogger(__name__)

BATCH_SIZE = 100


def upsert_chunks(chunks: List[dict]) -> int:
    index = get_pinecone_index()
    if index is None:
        logger.warning("[vector_store] Pinecone not available, skipping upsert")
        return 0

    vectors = [
        {"id": c["chunk_id"], "values": c["vector"], "metadata": c["metadata"]}
        for c in chunks
        if c.get("vector")
    ]

    total = 0
    for i in range(0, len(vectors), BATCH_SIZE):
        batch = vectors[i : i + BATCH_SIZE]
        index.upsert(vectors=batch)
        total += len(batch)
        logger.info("[vector_store] Upserted %d vectors", len(batch))

    return total


def similarity_search(
    query_vector: List[float],
    document_id: str,
    user_id: str,
    top_k: int = 5,
) -> List[dict]:
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
            "userId": {"$eq": user_id},
        },
    )

    return [
        {
            "chunk_id": match["id"],
            "score": round(match.get("score", 0), 4),
            "text": match.get("metadata", {}).get("text", ""),
        }
        for match in results.get("matches", [])
    ]


def delete_document_vectors(document_id: str) -> None:
    index = get_pinecone_index()
    if index is None:
        return
    try:
        index.delete(filter={"documentId": {"$eq": document_id}})
        logger.info("[vector_store] Deleted vectors for doc: %s", document_id)
    except Exception as exc:
        logger.error("[vector_store] Delete error: %s", exc)
