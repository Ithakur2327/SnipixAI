import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from app.core.config import get_settings
from app.core.database import get_database
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.mongo_utils import serialize_doc, to_object_id
from app.services import context_builder, embedder, extractor, vector_store
from app.services.cloudinary_client import delete_file_async, upload_file_async

logger = logging.getLogger(__name__)

MIME_TO_SOURCE_TYPE = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ppt",
    "text/plain": "txt",
    "image/png": "image",
    "image/jpeg": "image",
    "image/jpg": "image",
}


def _title_from_filename(filename: str) -> str:
    name = os.path.splitext(filename)[0]
    name = name.replace("_", " ").replace("-", " ").strip()
    return name[:120] if name else "Untitled document"


async def enforce_document_limit(user_id: str) -> None:
    settings = get_settings()
    db = get_database()
    count = await db.documents.count_documents({"userId": user_id})
    if settings.free_plan_document_limit > 0 and count >= settings.free_plan_document_limit:
        raise ForbiddenError(
            f"You've reached your limit of {settings.free_plan_document_limit} documents. Delete an old one to continue."
        )


async def create_document_from_upload(
    user_id: str, content: bytes, filename: str, mimetype: str, summary_instruction: str | None = None
) -> dict:
    """Creates the document record immediately (a single fast Mongo insert)
    WITHOUT waiting for the Cloudinary upload. This is what lets the upload
    API respond in milliseconds instead of waiting for a (potentially slow,
    for a 50MB file) round trip to Cloudinary - the frontend can navigate to
    the chat screen right away and show a "processing" state while
    upload_and_process() does the actual upload + extraction in the
    background."""
    source_type = MIME_TO_SOURCE_TYPE.get(mimetype)
    if not source_type:
        raise BadRequestError("Unsupported file type")

    await enforce_document_limit(user_id)

    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "userId": user_id,
        "title": _title_from_filename(filename),
        "sourceType": source_type,
        "sourceUrl": None,
        "cloudinaryId": None,
        "cloudinaryResourceType": None,
        "mimeType": mimetype,
        "status": "processing",
        "rawText": None,
        "wordCount": None,
        "pageCount": None,
        "condensedContext": None,
        "messageCount": 0,
        "errorMessage": None,
        "summaryInstruction": (summary_instruction or "").strip()[:1000],
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.documents.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def upload_and_process(document_id: str, content: bytes, filename: str, mimetype: str) -> None:
    """Background companion to create_document_from_upload. Extracts text
    directly from the bytes we already hold in memory - no need to wait
    for, or re-fetch from, Cloudinary - while the Cloudinary upload
    (needed only for permanent storage/display, not for reading the
    document) happens fully in parallel instead of before it."""
    db = get_database()
    object_id = to_object_id(document_id)
    doc = await db.documents.find_one({"_id": object_id})
    if not doc:
        return

    async def _store_in_cloudinary() -> None:
        try:
            upload_result = await upload_file_async(content, filename, mimetype)
            await db.documents.update_one(
                {"_id": object_id},
                {
                    "$set": {
                        "sourceUrl": upload_result["url"],
                        "cloudinaryId": upload_result["public_id"],
                        "cloudinaryResourceType": upload_result["resource_type"],
                        "updatedAt": datetime.now(timezone.utc),
                    }
                },
            )
        except Exception as exc:
            # Storage failing doesn't need to fail the whole document - the
            # user can still read/chat with the text already extracted
            # below; they just won't have a stored file link to reopen.
            logger.error("[document_service] Cloudinary upload failed for %s: %s", document_id, exc)

    cloudinary_task = asyncio.create_task(_store_in_cloudinary())

    try:
        raw_text, page_count = await extractor.extract_text_from_bytes_async(doc["sourceType"], content)
        await _finalize_document(object_id, doc, raw_text, page_count)
    except Exception as exc:
        await _mark_document_failed(object_id, document_id, exc)

    await cloudinary_task


async def create_document_from_url(
    user_id: str, url: str, title: Optional[str], summary_instruction: str | None = None
) -> dict:
    if not url or not url.startswith(("http://", "https://")):
        raise BadRequestError("Please provide a valid URL")

    await enforce_document_limit(user_id)

    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "userId": user_id,
        "title": title.strip()[:120] if title else url[:120],
        "sourceType": "url",
        "sourceUrl": url,
        "cloudinaryId": None,
        "cloudinaryResourceType": None,
        "mimeType": None,
        "status": "processing",
        "rawText": None,
        "wordCount": None,
        "pageCount": None,
        "condensedContext": None,
        "messageCount": 0,
        "errorMessage": None,
        "summaryInstruction": (summary_instruction or "").strip()[:1000],
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.documents.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def create_document_from_text(
    user_id: str, text: str, title: Optional[str], summary_instruction: str | None = None
) -> dict:
    if not text or not text.strip():
        raise BadRequestError("Please provide some text")

    await enforce_document_limit(user_id)

    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "userId": user_id,
        "title": title.strip()[:120] if title else "Pasted text",
        "sourceType": "raw_text",
        "sourceUrl": None,
        "cloudinaryId": None,
        "cloudinaryResourceType": None,
        "mimeType": None,
        "status": "processing",
        "rawText": text,
        "wordCount": None,
        "pageCount": None,
        "condensedContext": None,
        "messageCount": 0,
        "errorMessage": None,
        "summaryInstruction": (summary_instruction or "").strip()[:1000],
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.documents.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def process_document(document_id: str) -> None:
    """Used for URL and pasted-text documents, which need a network fetch
    (or nothing at all, for pasted text) rather than bytes already held in
    memory. See upload_and_process for the file-upload path."""
    db = get_database()
    object_id = to_object_id(document_id)
    doc = await db.documents.find_one({"_id": object_id})
    if not doc:
        return

    try:
        raw_text, page_count = await extractor.extract_text_async(
            source_type=doc["sourceType"],
            source_url=doc.get("sourceUrl"),
            raw_text=doc.get("rawText"),
        )
        await _finalize_document(object_id, doc, raw_text, page_count)
    except Exception as exc:
        await _mark_document_failed(object_id, document_id, exc)


async def _finalize_document(object_id, doc: dict, raw_text: Optional[str], page_count: Optional[int]) -> None:
    """Shared final stage for every document source (upload, URL, pasted
    text): chunk, condense, finish RAG indexing, then mark the document ready.

    Document processing must not spend the account's Groq TPM quota before
    the user's first summary request. Long documents use a deterministic
    bounded context here; the chat request performs the actual summary with
    the model.

    RAG indexing does not use Groq at all (local embedding model). It still
    finishes before "ready" is set so the frontend's first chat request has
    retrieval available.
    """
    db = get_database()
    document_id = str(object_id)
    raw_text = (raw_text or "").strip()
    if not raw_text:
        raise ValueError("No readable text could be extracted from this source.")

    word_count = len(raw_text.split())
    condensed_context = context_builder.get_fallback_context(raw_text)
    await _index_chunks_background(raw_text, document_id, doc["userId"])

    await db.documents.update_one(
        {"_id": object_id},
        {
            "$set": {
                "rawText": raw_text,
                "wordCount": word_count,
                "pageCount": page_count,
                "condensedContext": condensed_context,
                "condensedReady": True,
                "status": "ready",
                "errorMessage": None,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )
    logger.info("[document_service] Document %s ready for chat", document_id)
    # Topics are extracted lazily by exam_service when an exam is requested.
    # Starting another Groq request after ready competes with the user's first
    # chat request on the free-tier token window.


async def _mark_document_failed(object_id, document_id: str, exc: Exception) -> None:
    db = get_database()
    logger.error("[document_service] Failed to process document %s: %s", document_id, exc)
    await db.documents.update_one(
        {"_id": object_id},
        {
            "$set": {
                "status": "error",
                "errorMessage": str(exc)[:500],
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )


async def _extract_topics_background(document_id: str, context: str) -> None:
    try:
        topics = await context_builder.extract_topics(context)
        if topics:
            await set_document_topics(document_id, topics)
            logger.info("[document_service] Extracted %d topics for %s", len(topics), document_id)
    except Exception as exc:
        logger.error("[document_service] Background topic extraction failed for %s: %s", document_id, exc)


# The auto-summary chat request lands within ~1s of "ready" and needs the
# Groq token budget far more urgently than topic extraction does - a user
# is actively staring at a loading indicator for the former, while topics
# are only ever read later, when an exam is first requested (and even then
# exam_service extracts + persists them on the spot if this hasn't run
# yet). Waiting this long deliberately lets the ingestion + auto-summary
# burst clear Groq's ~60s rolling token window first instead of racing it,
# which is what was causing both calls to repeatedly 429 each other.
TOPIC_EXTRACTION_DELAY_SECONDS = 45


async def _delayed_extract_topics(document_id: str, context: str) -> None:
    await asyncio.sleep(TOPIC_EXTRACTION_DELAY_SECONDS)
    await _extract_topics_background(document_id, context)


async def set_document_topics(document_id: str, topics: list[str]) -> None:
    db = get_database()
    await db.documents.update_one(
        {"_id": to_object_id(document_id)},
        {"$set": {"topics": topics, "updatedAt": datetime.now(timezone.utc)}},
    )


async def update_exam_history(document_id: str, exam_history: dict) -> None:
    db = get_database()
    await db.documents.update_one(
        {"_id": to_object_id(document_id)},
        {"$set": {"examHistory": exam_history, "updatedAt": datetime.now(timezone.utc)}},
    )


async def _index_chunks_background(raw_text: str, document_id: str, user_id: str) -> None:
    """Embeds and upserts a document's chunks into Pinecone after the
    document is already marked ready. Sharpens follow-up-question answers
    with literal excerpts; not required for the first response, which
    reads condensedContext instead."""
    try:
        chunks = chunk_document(raw_text, document_id, user_id)
        if not chunks:
            return
        texts = [c["text"] for c in chunks]
        vectors = await embedder.embed_texts_async(texts)
        for chunk, vector in zip(chunks, vectors):
            chunk["vector"] = vector
        await vector_store.upsert_chunks_async(chunks)
        logger.info("[document_service] RAG index ready for %s", document_id)
    except Exception as exc:
        logger.error("[document_service] Background RAG indexing failed for %s: %s", document_id, exc)


def chunk_document(raw_text: str, document_id: str, user_id: str) -> list[dict]:
    from app.services.chunker import chunk_text

    return chunk_text(raw_text, document_id, user_id)


async def list_documents(user_id: str, page: int, limit: int, search: Optional[str]) -> tuple[list[dict], int]:
    db = get_database()
    query: dict = {"userId": user_id}
    if search:
        query["title"] = {"$regex": search.strip(), "$options": "i"}

    total = await db.documents.count_documents(query)
    cursor = (
        db.documents.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    documents = [serialize_doc(doc) async for doc in cursor]
    return documents, total


async def get_document(user_id: str, document_id: str) -> dict:
    db = get_database()
    doc = await db.documents.find_one({"_id": to_object_id(document_id)})
    if not doc:
        raise NotFoundError("Document not found")
    if doc["userId"] != user_id:
        raise ForbiddenError("You don't have access to this document")
    return doc


async def delete_document(user_id: str, document_id: str) -> None:
    doc = await get_document(user_id, document_id)
    db = get_database()
    object_id = doc["_id"]

    if doc.get("cloudinaryId"):
        await delete_file_async(doc["cloudinaryId"], doc.get("cloudinaryResourceType") or "raw")

    await vector_store.delete_document_vectors_async(str(object_id))
    await db.messages.delete_many({"documentId": str(object_id)})
    await db.chunks.delete_many({"documentId": str(object_id)})
    await db.documents.delete_one({"_id": object_id})


def to_public(doc: dict) -> dict:
    data = serialize_doc(doc)
    return {
        "id": data["id"],
        "title": data["title"],
        "sourceType": data["sourceType"],
        "status": data["status"],
        "wordCount": data.get("wordCount"),
        "pageCount": data.get("pageCount"),
        "messageCount": data.get("messageCount", 0),
        "errorMessage": data.get("errorMessage"),
        "fileUrl": data.get("sourceUrl"),
        "mimeType": data.get("mimeType"),
        "createdAt": data["createdAt"],
        "updatedAt": data["updatedAt"],
    }


async def increment_message_count(document_id: str) -> None:
    db = get_database()
    await db.documents.update_one(
        {"_id": to_object_id(document_id)},
        {"$inc": {"messageCount": 1}, "$set": {"updatedAt": datetime.now(timezone.utc)}},
    )