from datetime import datetime, timezone

from app.core.database import get_database
from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.core.mongo_utils import serialize_doc, to_object_id
from app.core.security import create_access_token, hash_password, verify_password


async def register_user(name: str, email: str, password: str) -> dict:
    db = get_database()
    normalized_email = email.strip().lower()
    existing = await db.users.find_one({"email": normalized_email})
    if existing:
        raise ConflictError("An account with this email already exists")

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": name.strip(),
        "email": normalized_email,
        "passwordHash": hash_password(password),
        "plan": "free",
        "avatarUrl": None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return user_doc


async def authenticate_user(email: str, password: str) -> dict:
    db = get_database()
    normalized_email = email.strip().lower()
    user = await db.users.find_one({"email": normalized_email})
    if not user or not verify_password(password, user["passwordHash"]):
        raise UnauthorizedError("Invalid email or password")
    return user


async def get_user_by_id(user_id: str) -> dict:
    db = get_database()
    user = await db.users.find_one({"_id": to_object_id(user_id)})
    if not user:
        raise NotFoundError("User not found")
    return user


async def update_user(user_id: str, updates: dict) -> dict:
    db = get_database()
    updates = {k: v for k, v in updates.items() if v is not None}
    if updates:
        updates["updatedAt"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": to_object_id(user_id)}, {"$set": updates})
    return await get_user_by_id(user_id)


def issue_token(user_id: str) -> str:
    return create_access_token(user_id)


def to_public(user: dict) -> dict:
    data = serialize_doc(user)
    data.pop("passwordHash", None)
    return data


async def count_user_documents(user_id: str) -> int:
    db = get_database()
    return await db.documents.count_documents({"userId": user_id})


async def count_ai_requests_today(user_id: str) -> int:
    db = get_database()
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return await db.messages.count_documents(
        {"userId": user_id, "role": "assistant", "createdAt": {"$gte": start_of_day}}
    )
