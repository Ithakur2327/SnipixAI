import logging
import os
from datetime import datetime, timezone
from typing import Optional

from app.core.config import get_settings
from app.core.database import get_database
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.mongo_utils import serialize_doc, to_object_id
from app.services import context_builder, embedder, extractor, vector_store
from app.services.cloudinary_client import delete_file, upload_file

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
    if count >= settings.free_plan_document_limit:
        raise ForbiddenError(
            f"You've reached your limit of {settings.free_plan_document_limit} documents. Delete an old one to continue."
        )


async def create_document_from_upload(user_id: str, content: bytes, filename: str, mimetype: str) -> dict:
    source_type = MIME_TO_SOURCE_TYPE.get(mimetype)
    if not source_type:
        raise BadRequestError("Unsupported file type")

    await enforce_document_limit(user_id)

    upload_result = upload_file(content, filename, mimetype)
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "userId": user_id,
        "title": _title_from_filename(filename),
        "sourceType": source_type,
        "sourceUrl": upload_result["url"],
        "cloudinaryId": upload_result["public_id"],
        "cloudinaryResourceType": upload_result["resource_type"],
        "mimeType": mimetype,
        "status": "processing",
        "rawText": None,
        "wordCount": None,
        "pageCount": None,
        "condensedContext": None,
        "messageCount": 0,
        "errorMessage": None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.documents.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def create_document_from_url(user_id: str, url: str, title: Optional[str]) -> dict:
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
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.documents.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def create_document_from_text(user_id: str, text: str, title: Optional[str]) -> dict:
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
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.documents.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def process_document(document_id: str) -> None:
    db = get_database()
    object_id = to_object_id(document_id)
    doc = await db.documents.find_one({"_id": object_id})
    if not doc:
        return

    try:
        raw_text, page_count = extractor.extract_text(
            source_type=doc["sourceType"],
            source_url=doc.get("sourceUrl"),
            raw_text=doc.get("rawText"),
        )
        raw_text = (raw_text or "").strip()
        if not raw_text:
            raise ValueError("No readable text could be extracted from this source.")

        word_count = len(raw_text.split())

        chunks = chunk_document(raw_text, str(object_id), doc["userId"])
        if chunks:
            texts = [c["text"] for c in chunks]
            vectors = embedder.embed_texts(texts)
            for chunk, vector in zip(chunks, vectors):
                chunk["vector"] = vector
            vector_store.upsert_chunks(chunks)

        condensed = await context_builder.build_document_context(raw_text)

        await db.documents.update_one(
            {"_id": object_id},
            {
                "$set": {
                    "rawText": raw_text,
                    "wordCount": word_count,
                    "pageCount": page_count,
                    "condensedContext": condensed,
                    "status": "ready",
                    "errorMessage": None,
                    "updatedAt": datetime.now(timezone.utc),
                }
            },
        )
        logger.info("[document_service] Document %s processed successfully", document_id)

    except Exception as exc:
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
        delete_file(doc["cloudinaryId"], doc.get("cloudinaryResourceType") or "raw")

    vector_store.delete_document_vectors(str(object_id))
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
