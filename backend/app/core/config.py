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
    # openai/gpt-oss-20b runs at roughly 2x the raw token throughput of
    # gpt-oss-120b on Groq (~1,000 tok/s vs ~500 tok/s) with the same
    # 131,072 token context window and the same reasoning controls below,
    # while still being Groq's currently "recommended" production model -
    # this is the single biggest lever available for cutting chat/exam
    # response time. It's a smaller model, so very occasionally it may be
    # slightly less nuanced on complex synthesis than the 120b version;
    # switch GROQ_MODEL back to "openai/gpt-oss-120b" if that trade-off
    # ever matters more than speed for your use case.
    groq_model: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    # openai/gpt-oss-120b is a reasoning model that, by default, spends a
    # chunk of every request "thinking" before it writes the visible
    # answer (default reasoning_effort is "medium" on Groq). That thinking
    # time is invisible to the user but adds real seconds to every
    # response, and - worse - the model sometimes puts its actual answer
    # entirely inside the hidden reasoning content instead of the visible
    # one, especially in JSON mode, which is what was breaking exam
    # generation. "low" effort + "hidden" reasoning format cuts that
    # thinking time down and guarantees only the final answer comes back
    # in the field we actually read.
    groq_reasoning_effort: str = os.getenv("GROQ_REASONING_EFFORT", "low")
    groq_reasoning_format: str = os.getenv("GROQ_REASONING_FORMAT", "hidden")

    pinecone_api_key: str = os.getenv("PINECONE_API_KEY", "")
    pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "snipixai")
    pinecone_cloud: str = os.getenv("PINECONE_CLOUD", "aws")
    pinecone_region: str = os.getenv("PINECONE_REGION", "us-east-1")
    embedding_dimension: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    # NOTE on "unlimited": openai/gpt-oss-20b's hard architectural ceilings
    # are a 131,072 token context window and 65,536 max completion tokens
    # per call (console.groq.com/docs/models) - the values below are set as
    # high as is actually useful under those ceilings. The one limit no
    # config value can remove is Groq's *account-tier* rate limit: the
    # on_demand/free tier for this model is capped at 8,000 tokens/minute,
    # 30 requests/minute and 1,000 requests/day, enforced on Groq's side
    # regardless of anything set here. llm.py already retries transient
    # 429s against that ceiling with backoff, but a single call that itself
    # needs more than ~8,000 tokens (prompt + output combined) will never
    # succeed on this tier no matter how long it waits - only Groq's paid
    # Dev Tier (250,000 TPM) removes that ceiling. The values below are
    # tuned to make full use of a normal request without routinely
    # exceeding it on their own.
    max_upload_size_mb: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "200"))
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    retrieval_top_k: int = int(os.getenv("RETRIEVAL_TOP_K", "4"))

    direct_context_char_budget: int = int(os.getenv("DIRECT_CONTEXT_CHAR_BUDGET", "20000"))
    condensed_section_char_size: int = int(os.getenv("CONDENSED_SECTION_CHAR_SIZE", "12000"))
    condensed_section_target_words: int = int(os.getenv("CONDENSED_SECTION_TARGET_WORDS", "450"))
    chat_history_turns: int = int(os.getenv("CHAT_HISTORY_TURNS", "8"))
    # Keep one request below Groq's 8k TPM free-tier ceiling. Long answers
    # continue through the existing continuation flow instead of requesting
    # 6k output tokens on top of a large document prompt.
    max_output_tokens: int = int(os.getenv("MAX_OUTPUT_TOKENS", "2800"))
    exam_max_output_tokens: int = int(os.getenv("EXAM_MAX_OUTPUT_TOKENS", "2800"))

    # A value of 0 disables the application-level quota - both already
    # unlimited by default, kept that way here.
    free_plan_document_limit: int = int(os.getenv("FREE_PLAN_DOCUMENT_LIMIT", "0"))
    free_plan_ai_daily_limit: int = int(os.getenv("FREE_PLAN_AI_DAILY_LIMIT", "0"))

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()