from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user
from app.core.rate_limit import ai_rate_limiter
from app.models.schemas import SendMessageRequest
from app.services import chat_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/{document_id}", dependencies=[Depends(ai_rate_limiter)])
async def send_message(
    document_id: str,
    payload: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
) -> StreamingResponse:
    generator = chat_service.stream_chat_response(
        str(current_user["_id"]), document_id, payload.message, continuation=payload.continuation
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{document_id}/history")
async def get_history(document_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    messages = await chat_service.get_chat_history(str(current_user["_id"]), document_id)
    return {"success": True, "data": {"messages": messages}}


@router.delete("/{document_id}/history")
async def clear_history(document_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    await chat_service.clear_chat_history(str(current_user["_id"]), document_id)
    return {"success": True, "data": {"message": "Conversation cleared"}}
