import logging
from typing import List

logger = logging.getLogger(__name__)

# ✅ FIX: Server start hote hi model load karo — lazy load ki wajah se
# pehla document 1+ minute late process hota tha aur frontend timeout karta tha
logger.info("[embedder] Loading sentence-transformers model...")
from sentence_transformers import SentenceTransformer
_model = SentenceTransformer("all-MiniLM-L6-v2")
logger.info("[embedder] Model loaded ✅")


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of texts using a local sentence-transformers model.
    No API calls, no rate limits, completely free.
    """
    vectors = _model.encode(texts, batch_size=32, show_progress_bar=False)
    logger.info(f"[embedder] Embedded {len(texts)} texts locally")
    return [v.tolist() for v in vectors]


def embed_query(query: str) -> List[float]:
    """Embed a single query string."""
    return embed_texts([query])[0]