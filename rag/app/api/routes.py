import logging
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.schemas import (
    ProcessDocumentRequest,
    SummarizeRequest,
    ChatRequest,
    ProcessResponse,
    SummarizeResponse,
    ChatResponse,
    HealthResponse,
)
from app.services.pipeline import (
    process_document,
    query_document,
    summarize_document,
    delete_document_data,
)
from app.core.pinecone_client import get_pinecone_index
from app.core.database import get_async_db

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Health ──────────────────────────────────────────────────
@router.get("/health", response_model=HealthResponse)
async def health_check():
    pinecone_status = "ok" if get_pinecone_index() else "unavailable"
    try:
        db = get_async_db()
        await db.command("ping")
        mongo_status = "ok"
    except Exception:
        mongo_status = "unavailable"

    return HealthResponse(
        status="ok",
        pinecone=pinecone_status,
        mongodb=mongo_status,
        openai="configured",
    )


# ── Process document ────────────────────────────────────────
@router.post("/process", response_model=ProcessResponse)
async def process_doc(req: ProcessDocumentRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        process_document,
        document_id=req.document_id,
        user_id=req.user_id,
        source_type=req.source_type.value,
        source_url=req.source_url,
        raw_text=req.raw_text,
    )
    return ProcessResponse(
        document_id=req.document_id,
        status="processing",
        message="Document processing started",
    )

# ── Process document synchronously (for small docs) ─────────
@router.post("/process/sync", response_model=ProcessResponse)
async def process_doc_sync(req: ProcessDocumentRequest):
    """Process document synchronously. Use for small docs."""
    try:
        result = await process_document(
            document_id=req.document_id,
            user_id=req.user_id,
            source_type=req.source_type,
            source_url=req.source_url,
            raw_text=req.raw_text,
        )
        return ProcessResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Summarize ───────────────────────────────────────────────
@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest):
    try:
        result = await summarize_document(
            document_id=req.document_id,
            raw_text=req.raw_text,
            output_type=req.output_type,
        )
        return SummarizeResponse(
            content=result["content"],
            model=result["model"],
            processing_time_ms=result["processing_time_ms"],
            token_usage=result["token_usage"],
        )
    except Exception as e:
        logger.error(f"[summarize] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Chat / RAG query ────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        result = await query_document(
            document_id=req.document_id,
            user_id=req.user_id,
            question=req.question,
            chat_history=req.chat_history,
            top_k=req.top_k,
        )
        return ChatResponse(
            answer=result["answer"],
            model=result["model"],
            processing_ms=result["processing_ms"],
            sources=result["sources"],
        )
    except Exception as e:
        logger.error(f"[chat] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Delete document vectors ─────────────────────────────────
@router.delete("/document/{document_id}")
async def delete_document(document_id: str):
    try:
        await delete_document_data(document_id)
        return {"message": "Document vectors deleted", "document_id": document_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))