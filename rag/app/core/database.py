from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from app.core.config import get_settings
from bson import ObjectId
from typing import Optional
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# Async client for FastAPI
_async_client: Optional[AsyncIOMotorClient] = None
_sync_client: Optional[MongoClient] = None


def get_async_db():
    global _async_client
    if _async_client is None:
        _async_client = AsyncIOMotorClient(settings.mongo_uri)
    return _async_client.get_default_database() or _async_client["snipixai"]


def get_sync_db():
    global _sync_client
    if _sync_client is None:
        _sync_client = MongoClient(settings.mongo_uri)
    return _sync_client.get_default_database() or _sync_client["snipixai"]


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise ValueError(f"Invalid ObjectId: {id_str}")