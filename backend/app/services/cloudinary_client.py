import asyncio

import cloudinary
import cloudinary.exceptions
import cloudinary.uploader

from app.core.config import get_settings
from app.core.exceptions import BadRequestError

_configured = False

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/jpg",
}

IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg"}


def _ensure_configured() -> None:
    global _configured
    if _configured:
        return
    settings = get_settings()
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    _configured = True


def upload_file(content: bytes, filename: str, mimetype: str) -> dict:
    _ensure_configured()
    resource_type = "image" if mimetype in IMAGE_MIME_TYPES else "raw"
    try:
        result = cloudinary.uploader.upload(
            content,
            folder="snipixai",
            resource_type=resource_type,
            type="upload",
            access_mode="public",
            filename=filename,
            use_filename=True,
            unique_filename=True,
        )
    except cloudinary.exceptions.Error as exc:
        message = str(exc)
        if "File size too large" in message or "Maximum is" in message:
            raise BadRequestError(
                "This file is too large for your storage plan's upload limit. Please upload a smaller file."
            )
        raise BadRequestError(f"File upload failed: {message}")
    return {
        "public_id": result.get("public_id"),
        "url": result.get("secure_url"),
        "resource_type": resource_type,
    }


def delete_file(public_id: str, resource_type: str = "raw") -> None:
    _ensure_configured()
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception:
        pass


# --- Async wrappers -------------------------------------------------------
# cloudinary's SDK is fully synchronous (blocking network I/O). For a large
# (up to 50MB) file this upload can take several seconds - run it in a
# thread so it never freezes the event loop for every other user.


async def upload_file_async(content: bytes, filename: str, mimetype: str) -> dict:
    return await asyncio.to_thread(upload_file, content, filename, mimetype)


async def delete_file_async(public_id: str, resource_type: str = "raw") -> None:
    await asyncio.to_thread(delete_file, public_id, resource_type)
