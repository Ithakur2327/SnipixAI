from pydantic_settings import BaseSettings
from functools import lru_cache
import os

# rag/ directory ka absolute path — config.py wahan se 2 level upar hai
_RAG_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"

    # Pinecone
    pinecone_api_key: str
    pinecone_index: str = "snipixai"
    pinecone_dimension: int = 1536

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017/snipixai"

    # Service
    port: int = 8000
    node_backend_url: str = "http://localhost:5000"

    class Config:
        # .env file rag/ root mein dhundo, services/ mein nahi
        env_file = os.path.join(_RAG_ROOT, ".env")
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()