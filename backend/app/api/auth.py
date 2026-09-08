from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.rate_limit import auth_rate_limiter
from app.models.schemas import AuthData, LoginRequest, RegisterRequest, UserPublic
from app.services import user_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", dependencies=[Depends(auth_rate_limiter)])
async def register(payload: RegisterRequest) -> dict:
    user = await user_service.register_user(payload.name, payload.email, payload.password)
    token = user_service.issue_token(str(user["_id"]))
    data = AuthData(user=UserPublic(**user_service.to_public(user)), token=token)
    return {"success": True, "data": data.model_dump()}


@router.post("/login", dependencies=[Depends(auth_rate_limiter)])
async def login(payload: LoginRequest) -> dict:
    user = await user_service.authenticate_user(payload.email, payload.password)
    token = user_service.issue_token(str(user["_id"]))
    data = AuthData(user=UserPublic(**user_service.to_public(user)), token=token)
    return {"success": True, "data": data.model_dump()}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)) -> dict:
    return {"success": True, "data": {"user": UserPublic(**user_service.to_public(current_user)).model_dump()}}


@router.post("/logout")
async def logout() -> dict:
    return {"success": True, "data": {"message": "Logged out"}}
