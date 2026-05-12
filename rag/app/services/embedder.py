import logging
from typing import List

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    """Lazy-load sentence-transformers model (free, runs locally)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info("[embedder] Loading sentence-transformers model...")
        # all-MiniLM-L6-v2 → 384-dim, fast, free
        # all-mpnet-base-v2  → 768-dim, higher quality
        # IMPORTANT: match dim to your Pinecone index dimension!
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("[embedder] Model loaded ✅")
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of texts using a local sentence-transformers model.
    No API calls, no rate limits, completely free.
    """
    model = _get_model()
    vectors = model.encode(texts, batch_size=32, show_progress_bar=False)
    logger.info(f"[embedder] Embedded {len(texts)} texts locally")
    return [v.tolist() for v in vectors]


def embed_query(query: str) -> List[float]:
    """Embed a single query string."""
    return embed_texts([query])[0]