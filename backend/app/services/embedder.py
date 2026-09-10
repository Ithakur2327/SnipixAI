import asyncio
import logging
import threading
from typing import List

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_model = None
_load_lock = threading.Lock()


def load_model() -> None:
    """Synchronous, thread-safe model load. Safe to call concurrently from
    multiple threads (e.g. the startup warm-up thread and a request thread
    racing to use the model) - only the first caller actually loads it."""
    global _model
    if _model is not None:
        return
    with _load_lock:
        if _model is not None:
            return
        settings = get_settings()
        logger.info("[embedder] Loading sentence-transformers model...")
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(settings.embedding_model)
        logger.info("[embedder] Model loaded")


def _get_model():
    if _model is None:
        load_model()
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    model = _get_model()
    vectors = model.encode(texts, batch_size=32, show_progress_bar=False)
    return [vector.tolist() for vector in vectors]


def embed_query(query: str) -> List[float]:
    return embed_texts([query])[0]


# --- Async wrappers -------------------------------------------------------
# The model load and inference are CPU-bound and block the calling thread.
# Run them in the default thread pool executor so they never block the
# FastAPI event loop (which would otherwise stall every other in-flight
# request - chat streams, uploads, health checks, etc).


async def load_model_async() -> None:
    await asyncio.to_thread(load_model)


async def embed_texts_async(texts: List[str]) -> List[List[float]]:
    return await asyncio.to_thread(embed_texts, texts)


async def embed_query_async(query: str) -> List[float]:
    return await asyncio.to_thread(embed_query, query)
