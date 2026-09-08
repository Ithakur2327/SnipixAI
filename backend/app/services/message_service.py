from datetime import datetime, timezone

from app.core.database import get_database
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.mongo_utils import serialize_doc, to_object_id


async def insert_message(
    document_id: str,
    user_id: str,
    role: str,
    type_: str,
    content: str | None = None,
    sources: list[dict] | None = None,
    exam: dict | None = None,
) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    message = {
        "documentId": document_id,
        "userId": user_id,
        "role": role,
        "type": type_,
        "content": content,
        "sources": sources or [],
        "exam": exam,
        "createdAt": now,
    }
    result = await db.messages.insert_one(message)
    message["_id"] = result.inserted_id
    return message


async def get_history(document_id: str, user_id: str, limit: int | None = None) -> list[dict]:
    db = get_database()
    cursor = db.messages.find({"documentId": document_id, "userId": user_id}).sort("createdAt", 1)
    messages = [msg async for msg in cursor]
    if limit:
        return messages[-limit:]
    return messages


async def clear_history(document_id: str, user_id: str) -> None:
    db = get_database()
    await db.messages.delete_many({"documentId": document_id, "userId": user_id})


async def get_message(message_id: str, user_id: str) -> dict:
    db = get_database()
    message = await db.messages.find_one({"_id": to_object_id(message_id)})
    if not message:
        raise NotFoundError("Message not found")
    if message["userId"] != user_id:
        raise ForbiddenError("You don't have access to this message")
    return message


async def update_exam_state(message_id: str, user_id: str, exam_updates: dict) -> dict:
    message = await get_message(message_id, user_id)
    if message["type"] != "exam" or not message.get("exam"):
        raise NotFoundError("Exam not found for this message")

    merged = {**message["exam"], **exam_updates}
    db = get_database()
    await db.messages.update_one({"_id": message["_id"]}, {"$set": {"exam": merged}})
    message["exam"] = merged
    return message


def to_public(message: dict) -> dict:
    return serialize_doc(message)
