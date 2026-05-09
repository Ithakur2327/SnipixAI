import logging
from typing import List
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: OpenAI = None


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of texts using OpenAI embeddings.
    Batches automatically for large inputs.
    """
    client = get_openai_client()
    BATCH_SIZE = 100
    all_vectors = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=batch,
        )
        vectors = [item.embedding for item in response.data]
        all_vectors.extend(vectors)
        logger.info(f"[embedder] Embedded batch {i//BATCH_SIZE + 1}: {len(batch)} texts")

    return all_vectors


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def embed_query(query: str) -> List[float]:
    """Embed a single query string."""
    client = get_openai_client()
    response = client.embeddings.create(
        model=settings.openai_embedding_model,
        input=[query],
    )
    return response.data[0].embedding