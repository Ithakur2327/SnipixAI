import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import auth, chat, documents, exam, users
from app.core.config import get_settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.core.exceptions import (
    AppError,
    app_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.rate_limit import api_rate_limiter
from app.services import embedder

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


async def _warm_up_embedder() -> None:
    """Loads the embedding model in a background thread so it never blocks
    server startup. Uvicorn starts accepting connections (health checks,
    auth, etc) immediately instead of waiting 10-30s+ for torch + the model
    to load. If a real request needs the model before this finishes, the
    embedder's own lock makes it wait safely instead of double-loading."""
    try:
        await embedder.load_model_async()
        logger.info("[startup] Embedding model warm-up complete")
    except Exception:
        logger.exception("[startup] Embedding model warm-up failed; will retry lazily on first use")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    asyncio.create_task(_warm_up_embedder())
    logger.info("SnipixAI backend ready (embedding model loading in background)")
    yield
    await close_mongo_connection()


settings = get_settings()

app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Compresses JSON/text responses (document text, chat history, etc) so
# larger payloads transfer faster over the wire.
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.client_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(auth.router, dependencies=[Depends(api_rate_limiter)])
app.include_router(users.router, dependencies=[Depends(api_rate_limiter)])
app.include_router(documents.router, dependencies=[Depends(api_rate_limiter)])
app.include_router(chat.router, dependencies=[Depends(api_rate_limiter)])
app.include_router(exam.router, dependencies=[Depends(api_rate_limiter)])


@app.get("/api/health")
async def health_check() -> dict:
    return {"success": True, "data": {"status": "ok", "service": settings.app_name}}
