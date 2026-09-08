from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.rate_limit import ai_rate_limiter
from app.models.schemas import GenerateExamRequest, RevealAnswerRequest, SubmitQuizAnswersRequest
from app.services import exam_service, message_service

router = APIRouter(prefix="/api/exam", tags=["exam"])


@router.post("/{document_id}/generate", dependencies=[Depends(ai_rate_limiter)])
async def generate_exam(
    document_id: str,
    payload: GenerateExamRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    message = await exam_service.generate_exam(
        str(current_user["_id"]),
        document_id,
        payload.examType,
        payload.topic,
        payload.useDocument,
        payload.numQuestions,
        payload.difficulty or "medium",
    )
    return {"success": True, "data": {"message": message_service.to_public(message)}}


@router.patch("/{message_id}/submit")
async def submit_quiz(
    message_id: str,
    payload: SubmitQuizAnswersRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    message = await exam_service.submit_quiz_answers(str(current_user["_id"]), message_id, payload.answers)
    return {"success": True, "data": {"message": message_service.to_public(message)}}


@router.patch("/{message_id}/reveal")
async def reveal_answer(
    message_id: str,
    payload: RevealAnswerRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    message = await exam_service.reveal_subjective_answer(
        str(current_user["_id"]), message_id, payload.questionId, payload.revealed
    )
    return {"success": True, "data": {"message": message_service.to_public(message)}}
