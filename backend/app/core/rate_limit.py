import time
from collections import defaultdict
from threading import Lock

from fastapi import Request

from app.core.exceptions import TooManyRequestsError

_buckets: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _client_key(request: Request, scope: str) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{scope}:{ip}"


class RateLimiter:
    def __init__(self, scope: str, max_requests: int, window_seconds: float, message: str | None = None):
        self.scope = scope
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.message = message or "Too many requests, please try again later."

    def __call__(self, request: Request) -> None:
        key = _client_key(request, self.scope)
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with _lock:
            hits = [t for t in _buckets[key] if t > cutoff]
            if len(hits) >= self.max_requests:
                _buckets[key] = hits
                raise TooManyRequestsError(self.message)
            hits.append(now)
            _buckets[key] = hits


auth_rate_limiter = RateLimiter("auth", max_requests=15, window_seconds=15 * 60, message="Too many auth attempts. Please wait a few minutes and try again.")
upload_rate_limiter = RateLimiter("upload", max_requests=25, window_seconds=60 * 60, message="Upload limit reached. Please wait before uploading more documents.")
ai_rate_limiter = RateLimiter("ai", max_requests=60, window_seconds=60 * 60, message="AI request limit reached. Please wait before trying again.")
api_rate_limiter = RateLimiter("api", max_requests=500, window_seconds=15 * 60, message="Too many requests. Please slow down.")
