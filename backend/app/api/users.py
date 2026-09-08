from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.schemas import UpdateProfileRequest, UsageData, UserPublic
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)) -> dict:
    return {"success": True, "data": {"user": UserPublic(**user_service.to_public(current_user)).model_dump()}}


@router.patch("/profile")
async def update_profile(payload: UpdateProfileRequest, current_user: dict = Depends(get_current_user)) -> dict:
    updated = await user_service.update_user(
        str(current_user["_id"]), {"name": payload.name, "avatarUrl": payload.avatarUrl}
    )
    return {"success": True, "data": {"user": UserPublic(**user_service.to_public(updated)).model_dump()}}


@router.get("/usage")
async def get_usage(current_user: dict = Depends(get_current_user)) -> dict:
    settings = get_settings()
    user_id = str(current_user["_id"])
    documents_used = await user_service.count_user_documents(user_id)
    ai_requests_today = await user_service.count_ai_requests_today(user_id)
    usage = UsageData(
        plan=current_user.get("plan", "free"),
        documentsUsed=documents_used,
        documentsLimit=settings.free_plan_document_limit,
        aiRequestsUsedToday=ai_requests_today,
        aiRequestsLimit=settings.free_plan_ai_daily_limit,
    )
    return {"success": True, "data": usage.model_dump()}
