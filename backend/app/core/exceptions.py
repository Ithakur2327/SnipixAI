from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 500, code: str = "internal_error"):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND, "not_found")


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, "unauthorized")


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status.HTTP_403_FORBIDDEN, "forbidden")


class BadRequestError(AppError):
    def __init__(self, message: str = "Bad request"):
        super().__init__(message, status.HTTP_400_BAD_REQUEST, "bad_request")


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict"):
        super().__init__(message, status.HTTP_409_CONFLICT, "conflict")


class TooManyRequestsError(AppError):
    def __init__(self, message: str = "Too many requests, please slow down"):
        super().__init__(message, status.HTTP_429_TOO_MANY_REQUESTS, "rate_limited")


def _error_body(message: str, code: str, status_code: int) -> dict:
    return {"success": False, "error": {"code": code, "message": message, "statusCode": status_code}}


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=_error_body(exc.message, exc.code, exc.status_code))


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content=_error_body(detail, "http_error", exc.status_code))


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else None
    message = first.get("msg", "Invalid request data") if first else "Invalid request data"
    field = ".".join(str(part) for part in first.get("loc", [])[1:]) if first else None
    full_message = f"{field}: {message}" if field else message
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(full_message, "validation_error", status.HTTP_422_UNPROCESSABLE_ENTITY),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body("Something went wrong on our end. Please try again.", "internal_error", 500),
    )
