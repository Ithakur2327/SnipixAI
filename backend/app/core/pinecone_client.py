import logging
import time

from pinecone import Pinecone, ServerlessSpec

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_index = None


def get_pinecone_index():
    global _index
    if _index is not None:
        return _index

    settings = get_settings()
    try:
        pc = Pinecone(api_key=settings.pinecone_api_key)
        existing = [item.name for item in pc.list_indexes()]

        if settings.pinecone_index_name not in existing:
            logger.info("Creating Pinecone index: %s", settings.pinecone_index_name)
            pc.create_index(
                name=settings.pinecone_index_name,
                dimension=settings.embedding_dimension,
                metric="cosine",
                spec=ServerlessSpec(cloud=settings.pinecone_cloud, region=settings.pinecone_region),
            )
            while not pc.describe_index(settings.pinecone_index_name).status["ready"]:
                time.sleep(1)
            logger.info("Pinecone index created")

        _index = pc.Index(settings.pinecone_index_name)
        logger.info("Pinecone ready: %s", settings.pinecone_index_name)
        return _index

    except Exception as exc:
        logger.warning("Pinecone unavailable: %s", exc)
        return None
