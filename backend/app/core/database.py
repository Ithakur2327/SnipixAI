import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_database() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database has not been initialized")
    return _db


async def connect_to_mongo() -> None:
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _db = _client.get_default_database()
    await _db.command("ping")
    await _create_indexes(_db)
    logger.info("Connected to MongoDB at %s", _db.name)


async def close_mongo_connection() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB connection closed")


async def _create_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.users.create_index("email", unique=True)
    await db.documents.create_index([("userId", 1), ("createdAt", -1)])
    await db.documents.create_index([("userId", 1), ("status", 1)])
    await db.chunks.create_index([("documentId", 1), ("chunkIndex", 1)])
    await db.messages.create_index([("documentId", 1), ("createdAt", 1)])
    await db.messages.create_index([("userId", 1)])
