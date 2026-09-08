import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    embedder.load_model()
    logger.info("SnipixAI backend ready")
    yield
    await close_mongo_connection()


settings = get_settings()

app = FastAPI(title=settings.app_name, lifespan=lifespan)

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
