import logging
from typing import List

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_model = None


def load_model() -> None:
    global _model
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
