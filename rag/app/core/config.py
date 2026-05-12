from pydantic_settings import BaseSettings
from functools import lru_cache
import os

_RAG_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class Settings(BaseSettings):
    # ── Groq (Free LLM) ──────────────────────────────────────────
    groq_api_key: str
    groq_chat_model: str = "llama-3.3-70b-versatile"

    # ── Pinecone ─────────────────────────────────────────────────
    pinecone_api_key: str
    pinecone_index: str = "snipixai"
    pinecone_dimension: int = 384   # all-MiniLM-L6-v2 = 384 dim

    # ── MongoDB ──────────────────────────────────────────────────
    mongo_uri: str = "mongodb://localhost:27017/snipixai"

    # ── Service ──────────────────────────────────────────────────
    port: int = 8000
    node_backend_url: str = "http://localhost:5000"

    class Config:
        env_file = os.path.join(_RAG_ROOT, ".env")
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()