import logging
from typing import Optional
from app.core.database import get_async_db, to_object_id
from app.services.extractor import extract_text
from app.services.chunker import chunk_text
from app.services.embedder import embed_texts, embed_query
from app.services.vector_store import upsert_chunks, similarity_search, delete_document_vectors
from app.services.rag_chain import generate_rag_answer, generate_summary
from app.models.schemas import OutputType

logger = logging.getLogger(__name__)


async def process_document(
    document_id: str,
    user_id:     str,
    source_type: str,
    source_url:  Optional[str] = None,
    raw_text:    Optional[str] = None,
) -> dict:
    """
    Full RAG pipeline:
    Extract → Chunk → Embed → Upsert Pinecone → Save chunks to MongoDB
    """
    db = get_async_db()

    try:
        # raw_text ke liye status "extracting" mat set karo —
        # text pehle se available hai, Node backend ne "ready" set kiya hua hai.
        # Sirf file/url/image types ke liye extracting status set karo.
        if source_type != "raw_text":
            await db.documents.update_one(
                {"_id": to_object_id(document_id)},
                {"$set": {"status": "extracting"}},
            )

        # ── 1. Extract text ──────────────────────────────────────
        logger.info(f"[pipeline] Extracting: {document_id} ({source_type})")

        clean_raw = raw_text.strip() if raw_text and raw_text.strip() else None
        clean_url = source_url.strip() if source_url and source_url.strip() else None

        text, page_count = extract_text(
            source_type=source_type,
            source_url=clean_url,
            raw_text=clean_raw,
        )

        if not text or not text.strip():
            raise ValueError(
                f"No text could be extracted from the document (type={source_type}). "
                "Check that the file is not empty, password-protected, or image-only."
            )

        word_count = len(text.split())
        logger.info(f"[pipeline] Extracted {word_count} words, {page_count or 'N/A'} pages")

        # ── 2. Save raw text to MongoDB ──────────────────────────
        await db.documents.update_one(
            {"_id": to_object_id(document_id)},
            {"$set": {
                "rawText":   text,
                "wordCount": word_count,
                "pageCount": page_count,
            }},
        )

        # ── 3. Chunk ─────────────────────────────────────────────
        chunks = chunk_text(text, document_id, user_id)
        logger.info(f"[pipeline] Created {len(chunks)} chunks")

        # ── 4. Embed ─────────────────────────────────────────────
        texts   = [c["text"] for c in chunks]
        vectors = embed_texts(texts)
        for i, chunk in enumerate(chunks):
            chunk["vector"] = vectors[i]

        # ── 5. Save chunks to MongoDB ─────────────────────────────
        chunk_docs = [
            {
                "documentId":     to_object_id(document_id),
                "userId":         to_object_id(user_id),
                "chunkIndex":     c["index"],
                "text":           c["text"],
                "tokenCount":     c["token_count"],
                "vectorId":       c["chunk_id"],
                "embeddingModel": "text-embedding-3-small",
            }
            for c in chunks
        ]
        if chunk_docs:
            await db.chunks.insert_many(chunk_docs)

        # ── 6. Upsert to Pinecone ─────────────────────────────────
        upserted = upsert_chunks(chunks)
        logger.info(f"[pipeline] Upserted {upserted} vectors to Pinecone")

        # ── 7. Mark ready ─────────────────────────────────────────
        await db.documents.update_one(
            {"_id": to_object_id(document_id)},
            {"$set": {"status": "ready"}},
        )

        logger.info(f"[pipeline] ✅ Done: {document_id}")
        return {
            "document_id":    document_id,
            "status":         "ready",
            "chunks_created": len(chunks),
            "message":        "Document processed successfully",
        }

    except Exception as e:
        logger.error(f"[pipeline] ❌ Error: {document_id} — {e}")
        try:
            await db.documents.update_one(
                {"_id": to_object_id(document_id)},
                {"$set": {
                    "status":       "failed",
                    "errorMessage": str(e),
                }},
            )
        except Exception:
            pass
        raise


async def query_document(
    document_id:  str,
    user_id:      str,
    question:     str,
    chat_history: list = None,
    top_k:        int  = 5,
) -> dict:
    """RAG query pipeline."""
    query_vector = embed_query(question)
    chunks       = similarity_search(query_vector, document_id, user_id, top_k)

    if not chunks:
        return {
            "answer":        "I couldn't find relevant information in this document.",
            "model":         "none",
            "processing_ms": 0,
            "sources":       [],
        }

    return generate_rag_answer(question, chunks, chat_history or [])


async def summarize_document(
    document_id: str,
    raw_text:    str,
    output_type: str,
) -> dict:
    """Summarize document using Groq."""
    if not raw_text or not raw_text.strip():
        db = get_async_db()
        doc = await db.documents.find_one({"_id": to_object_id(document_id)})
        if doc and doc.get("rawText"):
            raw_text = doc["rawText"]
        else:
            raise ValueError("Document has no extracted text to summarize")

    return generate_summary(raw_text, OutputType(output_type))


async def delete_document_data(document_id: str) -> None:
    """Delete document vectors and chunks."""
    db = get_async_db()
    await db.chunks.delete_many({"documentId": to_object_id(document_id)})
    delete_document_vectors(document_id)