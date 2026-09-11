from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.exceptions import BadRequestError
from app.core.rate_limit import upload_rate_limiter
from app.models.schemas import CreateFromTextRequest, CreateFromUrlRequest, DocumentListData, DocumentPublic
from app.services import document_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", dependencies=[Depends(upload_rate_limiter)])
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> dict:
    settings = get_settings()
    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise BadRequestError(f"File exceeds the {settings.max_upload_size_mb}MB upload limit")
    if not content:
        raise BadRequestError("The uploaded file is empty")

    filename = file.filename or "upload"
    mimetype = file.content_type or "application/octet-stream"

    doc = await document_service.create_document_from_upload(str(current_user["_id"]), content, filename, mimetype)
    # Cloudinary upload + extraction happen entirely in the background now,
    # so this endpoint returns as soon as the (fast) DB insert is done - the
    # frontend gets a documentId immediately and can show the chat screen
    # right away instead of waiting for the file to finish uploading to
    # Cloudinary first.
    background_tasks.add_task(document_service.upload_and_process, str(doc["_id"]), content, filename, mimetype)
    return {"success": True, "data": {"document": DocumentPublic(**document_service.to_public(doc)).model_dump()}}


@router.post("/url", dependencies=[Depends(upload_rate_limiter)])
async def create_from_url(
    payload: CreateFromUrlRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
) -> dict:
    doc = await document_service.create_document_from_url(str(current_user["_id"]), payload.url, payload.title)
    background_tasks.add_task(document_service.process_document, str(doc["_id"]))
    return {"success": True, "data": {"document": DocumentPublic(**document_service.to_public(doc)).model_dump()}}


@router.post("/text", dependencies=[Depends(upload_rate_limiter)])
async def create_from_text(
    payload: CreateFromTextRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
) -> dict:
    doc = await document_service.create_document_from_text(str(current_user["_id"]), payload.text, payload.title)
    background_tasks.add_task(document_service.process_document, str(doc["_id"]))
    return {"success": True, "data": {"document": DocumentPublic(**document_service.to_public(doc)).model_dump()}}


@router.get("")
async def list_documents(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    search: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
) -> dict:
    documents, total = await document_service.list_documents(str(current_user["_id"]), page, limit, search)
    data = DocumentListData(
        documents=[DocumentPublic(**document_service.to_public(d)) for d in documents], total=total
    )
    return {"success": True, "data": data.model_dump()}


@router.get("/{document_id}")
async def get_document(document_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    doc = await document_service.get_document(str(current_user["_id"]), document_id)
    return {"success": True, "data": {"document": DocumentPublic(**document_service.to_public(doc)).model_dump()}}


@router.get("/{document_id}/status")
async def get_document_status(document_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    doc = await document_service.get_document(str(current_user["_id"]), document_id)
    return {
        "success": True,
        "data": {"status": doc["status"], "errorMessage": doc.get("errorMessage")},
    }


@router.delete("/{document_id}")
async def delete_document(document_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    await document_service.delete_document(str(current_user["_id"]), document_id)
    return {"success": True, "data": {"message": "Document deleted"}}
