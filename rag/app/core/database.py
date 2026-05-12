from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from app.core.config import get_settings
from bson import ObjectId
from typing import Optional
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

_async_client: Optional[AsyncIOMotorClient] = None
_sync_client:  Optional[MongoClient]        = None

DB_NAME = "snipixai"


def _parse_db_name(uri: str) -> str:
    """Extract database name from URI, fallback to DB_NAME."""
    try:
        # mongodb://host:port/dbname  OR  mongodb+srv://...host/dbname
        path = uri.split("/")[-1].split("?")[0].strip()
        return path if path else DB_NAME
    except Exception:
        return DB_NAME


def get_async_db():
    global _async_client
    if _async_client is None:
        _async_client = AsyncIOMotorClient(settings.mongo_uri)
    # ✅ FIX: 'or' operator on Database object causes TypeError
    # Always use explicit database name — never rely on bool(db)
    db_name = _parse_db_name(settings.mongo_uri)
    return _async_client[db_name]


def get_sync_db():
    global _sync_client
    if _sync_client is None:
        _sync_client = MongoClient(settings.mongo_uri)
    db_name = _parse_db_name(settings.mongo_uri)
    return _sync_client[db_name]


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise ValueError(f"Invalid ObjectId: {id_str}")