import json
import re
import uuid

from app.core.exceptions import BadRequestError
from app.services import document_service, llm, message_service

QUIZ_INSTRUCTIONS = """Return ONLY a raw JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0,
      "explanation": "string"
    }
  ]
}
Each question must have exactly 4 plausible options. correctIndex is the zero-based index of the single correct option. explanation briefly justifies why that option is correct."""

SUBJECTIVE_INSTRUCTIONS = """Return ONLY a raw JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "questions": [
    {
      "question": "string",
      "answer": "string"
    }
  ]
}
"answer" must be a complete, well-explained model solution a student could study from."""


def _extract_json_object(raw: str) -> dict:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    raise BadRequestError("The AI returned an unexpected format while generating the exam. Please try again.")


def _build_prompt(exam_type: str, topic: str | None, use_document: bool, num_questions: int, difficulty: str, document_block: str | None) -> list[dict]:
    instructions = QUIZ_INSTRUCTIONS if exam_type == "quiz" else SUBJECTIVE_INSTRUCTIONS
    focus = f' focused specifically on "{topic}"' if topic else ""
    grounding = (
        f"Base the questions strictly on the following document.\n\n{document_block}"
        if use_document and document_block
        else f'Base the questions on your own general knowledge of the subject "{topic}".'
    )
    user_prompt = (
        f"Create exactly {num_questions} {difficulty}-difficulty {'multiple-choice' if exam_type == 'quiz' else 'subjective'} "
        f"exam questions{focus}.\n\n{grounding}\n\n{instructions}"
    )
    return [
        {
            "role": "system",
            "content": "You are an expert exam writer. You always produce accurate, well-calibrated, unambiguous questions and respond with strict JSON only.",
        },
        {"role": "user", "content": user_prompt},
    ]


def _normalize_questions(exam_type: str, raw_questions: list[dict]) -> list[dict]:
    normalized = []
    for item in raw_questions:
        question_text = (item.get("question") or "").strip()
        if not question_text:
            continue
        question = {"id": uuid.uuid4().hex[:8], "question": question_text}
        if exam_type == "quiz":
            options = item.get("options") or []
            if len(options) < 2:
                continue
            question["options"] = [str(opt) for opt in options]
            correct_index = item.get("correctIndex")
            question["correctIndex"] = int(correct_index) if isinstance(correct_index, (int, float)) else 0
            question["explanation"] = item.get("explanation") or ""
        else:
            question["answer"] = item.get("answer") or ""
        normalized.append(question)
    return normalized


async def generate_exam(
    user_id: str,
    document_id: str,
    exam_type: str,
    topic: str | None,
    use_document: bool,
    num_questions: int,
    difficulty: str,
) -> dict:
    doc = await document_service.get_document(user_id, document_id)

    if not use_document and not topic:
        raise BadRequestError("Please provide a topic for the exam")

    document_block = None
    resolved_topic = topic
    if use_document:
        if doc["status"] != "ready":
            raise BadRequestError("This document is still being processed. Please wait a moment.")
        document_block = doc.get("condensedContext") or doc.get("rawText") or ""
        if not resolved_topic:
            resolved_topic = doc["title"]

    messages = _build_prompt(exam_type, topic, use_document, num_questions, difficulty, document_block)
    raw = await llm.generate_completion(messages, max_tokens=4096, temperature=0.5, json_mode=True)
    parsed = _extract_json_object(raw)
    questions = _normalize_questions(exam_type, parsed.get("questions") or [])

    if not questions:
        raise BadRequestError("Could not generate exam questions. Please try again.")

    exam_data = {
        "examType": exam_type,
        "topic": resolved_topic or "General",
        "questions": questions,
        "userAnswers": {},
        "submitted": False,
        "revealed": {},
        "score": None,
    }

    message = await message_service.insert_message(
        document_id, user_id, "assistant", "exam", content=None, exam=exam_data
    )
    await document_service.increment_message_count(document_id)
    return message


async def submit_quiz_answers(user_id: str, message_id: str, answers: dict[str, int]) -> dict:
    message = await message_service.get_message(message_id, user_id)
    exam = message.get("exam") or {}
    if exam.get("examType") != "quiz":
        raise BadRequestError("This exam does not accept selected answers")

    correct = 0
    for question in exam.get("questions", []):
        qid = question["id"]
        if qid in answers and answers[qid] == question.get("correctIndex"):
            correct += 1

    updates = {
        "userAnswers": {k: v for k, v in answers.items()},
        "submitted": True,
        "score": {"correct": correct, "total": len(exam.get("questions", []))},
    }
    return await message_service.update_exam_state(message_id, user_id, updates)


async def reveal_subjective_answer(user_id: str, message_id: str, question_id: str, revealed: bool) -> dict:
    message = await message_service.get_message(message_id, user_id)
    exam = message.get("exam") or {}
    if exam.get("examType") != "subjective":
        raise BadRequestError("This exam does not support revealing answers this way")

    current = dict(exam.get("revealed") or {})
    current[question_id] = revealed
    return await message_service.update_exam_state(message_id, user_id, {"revealed": current})
