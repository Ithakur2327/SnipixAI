import os
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "SnipixAI"
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = int(os.getenv("PORT", "5000"))
    client_url: str = os.getenv("CLIENT_URL", "http://localhost:3000")

    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/snipixai")

    jwt_secret: str = os.getenv("JWT_SECRET", "change-this-secret-in-production")
    jwt_expires_in: str = os.getenv("JWT_EXPIRES_IN", "7d")

    cloudinary_cloud_name: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    cloudinary_api_key: str = os.getenv("CLOUDINARY_API_KEY", "")
    cloudinary_api_secret: str = os.getenv("CLOUDINARY_API_SECRET", "")

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    pinecone_api_key: str = os.getenv("PINECONE_API_KEY", "")
    pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "snipixai")
    pinecone_cloud: str = os.getenv("PINECONE_CLOUD", "aws")
    pinecone_region: str = os.getenv("PINECONE_REGION", "us-east-1")
    embedding_dimension: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    max_upload_size_mb: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    retrieval_top_k: int = int(os.getenv("RETRIEVAL_TOP_K", "6"))

    direct_context_char_budget: int = int(os.getenv("DIRECT_CONTEXT_CHAR_BUDGET", "42000"))
    condensed_section_char_size: int = int(os.getenv("CONDENSED_SECTION_CHAR_SIZE", "9000"))
    condensed_section_target_words: int = int(os.getenv("CONDENSED_SECTION_TARGET_WORDS", "220"))
    chat_history_turns: int = int(os.getenv("CHAT_HISTORY_TURNS", "8"))
    max_output_tokens: int = int(os.getenv("MAX_OUTPUT_TOKENS", "3072"))
    exam_max_output_tokens: int = int(os.getenv("EXAM_MAX_OUTPUT_TOKENS", "4096"))

    free_plan_document_limit: int = int(os.getenv("FREE_PLAN_DOCUMENT_LIMIT", "20"))
    free_plan_ai_daily_limit: int = int(os.getenv("FREE_PLAN_AI_DAILY_LIMIT", "80"))

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()