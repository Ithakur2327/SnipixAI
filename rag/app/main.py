import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.pinecone_client import get_pinecone_index
from app.core.database import get_async_db
from app.api.routes import router

# ── Logging setup ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Starting SnipixAI RAG Service...")

    # Test MongoDB
    try:
        db = get_async_db()
        await db.command("ping")
        logger.info("✅ MongoDB connected")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")

    # Init Pinecone
    index = get_pinecone_index()
    if index:
        logger.info("✅ Pinecone ready")
    else:
        logger.warning("⚠️ Pinecone unavailable — RAG disabled")

    logger.info(f"✅ RAG Service ready on port {settings.port}")
    yield
    logger.info("🛑 RAG Service shutting down...")


# ── FastAPI app ──
app = FastAPI(
    title="SnipixAI RAG Service",
    description="Python-based RAG pipeline for SnipixAI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/rag")


@app.get("/")
def root():
    return {
        "service": "SnipixAI RAG Service",
        "version": "1.0.0",
        "docs":    "/docs",
    }