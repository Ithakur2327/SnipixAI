import json
import logging
import uuid

from app.core.exceptions import BadRequestError
from app.services import document_service, llm, message_service

logger = logging.getLogger(__name__)


def _document_context(document: dict, use_document: bool) -> str:
    if not use_document:
        return ""
    return (document.get("condensedContext") or document.get("rawText") or "").strip()


def _strip_json_fence(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines.pop()
        cleaned = "\n".join(lines).strip()
    return cleaned


async def generate_exam(
    user_id: str,
    document_id: str,
    exam_type: str,
    topic: str | None,
    use_document: bool,
    num_questions: int,
    difficulty: str,
) -> dict:
    document = await document_service.get_document(user_id, document_id)
    if document.get("status") != "ready":
        raise BadRequestError("This document is still being processed.")

    selected_topic = (topic or "the document").strip()
    context = _document_context(document, use_document)
    if use_document and not context:
        raise BadRequestError("No readable document content is available for this exam.")

    if exam_type == "quiz":
        question_shape = "Each question must have exactly four options, a zero-based correctIndex, and a short explanation."
    else:
        question_shape = "Each question must have an answer with key points. Set options, correctIndex, and explanation to null."

    prompt = f'''Create a {difficulty} {exam_type} exam with exactly {num_questions} questions about {selected_topic}.
Return only valid JSON with this shape:
{{"questions":[{{"question":"...","options":[],"correctIndex":0,"explanation":"...","answer":"..."}}]}}
Use a unique short question id for every question. {question_shape}
Use the document content as the source of truth and cover different sections when possible.

Document content:
{context}
'''
    response = await llm.generate_completion(
        [
            {"role": "system", "content": "You generate accurate exams and return strict JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max(2048, num_questions * 500),
        temperature=0.25,
        json_mode=True,
    )
    try:
        parsed = json.loads(_strip_json_fence(response))
        questions = parsed.get("questions")
        if not isinstance(questions, list) or len(questions) != num_questions:
            raise ValueError("The model returned an invalid question count.")
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        logger.error("[exam_service] Invalid exam response: %s", exc)
        raise BadRequestError("The exam could not be generated. Please try again.") from exc

    normalized = []
    for question in questions:
        if not isinstance(question, dict) or not str(question.get("question", "")).strip():
            raise BadRequestError("The exam response contained an invalid question.")
        question["id"] = str(question.get("id") or uuid.uuid4().hex[:10])
        if exam_type == "quiz":
            if not isinstance(question.get("options"), list) or len(question["options"]) < 2 or not isinstance(question.get("correctIndex"), int):
                raise BadRequestError("The exam response contained an invalid quiz question.")
        else:
            question["options"] = None
            question["correctIndex"] = None
        normalized.append(question)

    exam = {
        "examType": exam_type,
        "topic": selected_topic,
        "questions": normalized,
        "userAnswers": {},
        "submitted": False,
        "revealed": {},
        "score": None,
    }
    message = await message_service.insert_message(document_id, user_id, "assistant", "exam", exam=exam)
    await document_service.increment_message_count(document_id)
    return message


async def submit_quiz_answers(user_id: str, message_id: str, answers: dict[str, int]) -> dict:
    message = await message_service.get_message(message_id, user_id)
    exam = message.get("exam") or {}
    if exam.get("examType") != "quiz":
        raise BadRequestError("Only quiz exams can be submitted.")
    questions = exam.get("questions") or []
    correct = sum(1 for question in questions if answers.get(question.get("id")) == question.get("correctIndex"))
    return await message_service.update_exam_state(
        message_id,
        user_id,
        {"userAnswers": answers, "submitted": True, "score": {"correct": correct, "total": len(questions)}},
    )


async def reveal_subjective_answer(user_id: str, message_id: str, question_id: str, revealed: bool) -> dict:
    message = await message_service.get_message(message_id, user_id)
    exam = message.get("exam") or {}
    if exam.get("examType") != "subjective":
        raise BadRequestError("Only subjective exams have revealable answers.")
    reveal_state = {**(exam.get("revealed") or {}), question_id: revealed}
    return await message_service.update_exam_state(message_id, user_id, {"revealed": reveal_state})
