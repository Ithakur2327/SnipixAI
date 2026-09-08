import jwt
from fastapi import Depends, Header

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.services.user_service import get_user_by_id


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Authentication token is missing")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid authentication token")

    user_id = payload.get("id")
    if not user_id:
        raise UnauthorizedError("Invalid authentication token")

    return await get_user_by_id(user_id)


async def get_current_user_id(user: dict = Depends(get_current_user)) -> str:
    return str(user["_id"])
