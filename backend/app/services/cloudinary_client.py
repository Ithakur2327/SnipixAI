import cloudinary
import cloudinary.uploader

from app.core.config import get_settings

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
