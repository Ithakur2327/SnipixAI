from pinecone import Pinecone, ServerlessSpec
from app.core.config import get_settings
import logging
import time

logger = logging.getLogger(__name__)
settings = get_settings()

_index = None


def get_pinecone_index():
    global _index
    if _index is not None:
        return _index

    try:
        pc = Pinecone(api_key=settings.pinecone_api_key)

        existing = [i.name for i in pc.list_indexes()]

        if settings.pinecone_index not in existing:
            logger.info(f"Creating Pinecone index: {settings.pinecone_index}")
            pc.create_index(
                name=settings.pinecone_index,
                dimension=settings.pinecone_dimension,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
            # Wait for index to be ready
            while not pc.describe_index(settings.pinecone_index).status["ready"]:
                time.sleep(1)
            logger.info("✅ Pinecone index created")

        _index = pc.Index(settings.pinecone_index)
        logger.info(f"✅ Pinecone ready: {settings.pinecone_index}")
        return _index

    except Exception as e:
        logger.warning(f"⚠️ Pinecone unavailable: {e}")
        return None