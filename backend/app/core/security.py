import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import get_settings

_DURATION_RE = re.compile(r"^(\d+)([smhd])$", re.IGNORECASE)
_UNIT_SECONDS = {"s": 1, "m": 60, "h": 3600, "d": 86400}


def parse_duration_to_timedelta(value: str) -> timedelta:
    match = _DURATION_RE.match(value.strip())
    if not match:
        return timedelta(days=7)
    amount, unit = match.groups()
    return timedelta(seconds=int(amount) * _UNIT_SECONDS[unit.lower()])


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expires_delta = parse_duration_to_timedelta(settings.jwt_expires_in)
    now = datetime.now(timezone.utc)
    payload = {"id": user_id, "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
