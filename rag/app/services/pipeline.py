import logging
from typing import Optional
from app.core.database import get_async_db, to_object_id
from app.services.extractor import extract_text
from app.services.chunker import chunk_text
from app.services.embedder import embed_texts, embed_query
from app.services.vector_store import upsert_chunks, similarity_search, delete_document_vectors
from app.services.rag_chain import generate_rag_answer, generate_summary
from app.models.schemas import OutputType, SourceType

logger = logging.getLogger(__name__)


async def process_document(
    document_id: str,
    user_id: str,
    source_type: str,
    source_url: Optional[str] = None,
    raw_text: Optional[str] = None,
) -> dict:
    """
    Full pipeline:
    Extract → Chunk → Embed → Upsert Pinecone → Save chunks to MongoDB
    """
    db = get_async_db()

    try:
        # Update status: extracting
        await db.documents.update_one(
            {"_id": to_object_id(document_id)},
            {"$set": {"status": "extracting"}},
        )

        # 1. Extract text
        logger.info(f"[pipeline] Extracting text for {document_id} ({source_type})")
        text, page_count = extract_text(
            source_type=source_type,
            source_url=source_url,
            raw_text=raw_text,
        )

        if not text or not text.strip():
            raise ValueError("No text could be extracted from the document")

        word_count = len(text.split())

        # 2. Save raw text to MongoDB
        await db.documents.update_one(
            {"_id": to_object_id(document_id)},
            {"$set": {
                "rawText":   text,
                "wordCount": word_count,
                "pageCount": page_count,
            }},
        )

        # 3. Chunk text
        logger.info(f"[pipeline] Chunking {word_count} words")
        chunks = chunk_text(text, document_id, user_id)

        # 4. Embed chunks
        logger.info(f"[pipeline] Embedding {len(chunks)} chunks")
        texts = [c["text"] for c in chunks]
        vectors = embed_texts(texts)

        for i, chunk in enumerate(chunks):
            chunk["vector"] = vectors[i]

        # 5. Save chunks to MongoDB
        chunk_docs = [
            {
                "documentId":    to_object_id(document_id),
                "userId":        to_object_id(user_id),
                "chunkIndex":    c["index"],
                "text":          c["text"],
                "tokenCount":    c["token_count"],
                "vectorId":      c["chunk_id"],
                "embeddingModel": "text-embedding-3-small",
            }
            for c in chunks
        ]

        if chunk_docs:
            await db.chunks.insert_many(chunk_docs)

        # 6. Upsert to Pinecone
        upserted = upsert_chunks(chunks)
        logger.info(f"[pipeline] Upserted {upserted} vectors to Pinecone")

        # 7. Mark document as ready
        await db.documents.update_one(
            {"_id": to_object_id(document_id)},
            {"$set": {"status": "ready"}},
        )

        logger.info(f"[pipeline] ✅ Document {document_id} processed successfully")
        return {
            "document_id":    document_id,
            "status":         "ready",
            "chunks_created": len(chunks),
            "message":        "Document processed successfully",
        }

    except Exception as e:
        logger.error(f"[pipeline] ❌ Error processing {document_id}: {e}")
        await db.documents.update_one(
            {"_id": to_object_id(document_id)},
            {"$set": {"status": "failed"}},
        )
        raise


async def query_document(
    document_id: str,
    user_id: str,
    question: str,
    chat_history: list = None,
    top_k: int = 5,
) -> dict:
    """RAG query pipeline."""
    # 1. Embed question
    query_vector = embed_query(question)

    # 2. Search Pinecone
    chunks = similarity_search(query_vector, document_id, user_id, top_k)

    if not chunks:
        return {
            "answer":        "I couldn't find relevant information in this document.",
            "model":         "none",
            "processing_ms": 0,
            "sources":       [],
        }

    # 3. Generate answer
    result = generate_rag_answer(question, chunks, chat_history or [])
    return result


async def summarize_document(
    document_id: str,
    raw_text: str,
    output_type: str,
) -> dict:
    """Summarize document."""
    result = generate_summary(raw_text, OutputType(output_type))
    return result


async def delete_document_data(document_id: str) -> None:
    """Delete document vectors and chunks."""
    db = get_async_db()
    await db.chunks.delete_many({"documentId": to_object_id(document_id)})
    delete_document_vectors(document_id)