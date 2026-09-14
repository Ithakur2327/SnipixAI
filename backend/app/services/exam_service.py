import asyncio
import json
import logging
import uuid

from app.core.exceptions import BadRequestError
from app.services import context_builder, document_service, embedder, llm, message_service, vector_store

logger = logging.getLogger(__name__)

# Every exam covers ALL of a document's topics rather than a subset - a
# document with 12 topics gets an exam with 12 topics worth of questions,
# not a fixed 5 or 10. Grouping topics into small batches (instead of one
# call per topic, or one call for every topic at once) balances two real
# constraints: asking an LLM for an exact large item count in one JSON blob
# is unreliable (that was the original crash - "invalid question count"),
# while Groq's free tier also caps requests/day (1,000) as well as
# tokens/minute, so one call per topic would burn through that budget fast
# on a document with many topics.
#
# Batches run ONE AT A TIME (not concurrently). On an account that's
# already near its 8000 TPM ceiling, firing several batches at once doesn't
# make the exam finish faster - Groq judges "tokens used so far" per
# request, so simultaneous requests just collide and 429 each other,
# forcing wasted retries. Running them sequentially means each batch's
# call reflects the real, current usage, so it's actually more likely to
# succeed on the first try - which in practice finishes faster than a
# "concurrent but mostly rejected" burst would.
TOPICS_PER_BATCH = 5
QUESTIONS_PER_TOPIC = 3
MAX_CONCURRENT_BATCHES = 1
MAX_PRIOR_QUESTIONS_PER_TOPIC = 6
RETRIEVAL_TOP_K_PER_TOPIC = 2
MAX_EXAM_CONTEXT_CHARS = 8000


def _document_context(document: dict, use_document: bool) -> str:
    if not use_document:
        return ""
    return (document.get("condensedContext") or document.get("rawText") or "").strip()


def _question_shape_instruction(exam_type: str) -> str:
    if exam_type == "quiz":
        return "Each question must have exactly four options, a zero-based correctIndex, and a short explanation."
    return "Each question must have an answer with key points written out in full. Set options, correctIndex, and explanation to null."


async def _ensure_topics(document: dict, context: str) -> list[str]:
    """Return the document's topic list, extracting (and persisting) it on
    the spot if background extraction from ingestion hasn't finished or
    this document predates the feature."""
    topics = document.get("topics")
    if topics:
        return topics
    if not context:
        return []
    topics = await context_builder.extract_topics(context)
    if topics:
        await document_service.set_document_topics(str(document["_id"]), topics)
    return topics


async def _batch_context(
    topics: list[str], document_id: str, user_id: str, fallback: str, use_document: bool
) -> str:
    """Prefer compact, topic-focused context pulled from the RAG index (the
    same retrieval chat uses) over sending the entire document to every
    batch - much lighter on Groq's per-minute token budget, and keeps
    questions grounded in the parts of the document that actually discuss
    these topics. Falls back to the bounded whole-document context if
    retrieval isn't available yet (e.g. indexing still running) or fails.
    Skipped entirely when the caller opted out of document grounding."""
    if not use_document:
        return fallback
    try:
        query_vector = await embedder.embed_query_async(" / ".join(topics))
        matches = await vector_store.similarity_search_async(
            query_vector, document_id, user_id, top_k=RETRIEVAL_TOP_K_PER_TOPIC * len(topics)
        )
    except Exception as exc:
        logger.warning("[exam_service] Retrieval failed for topics %s: %s", topics, exc)
        matches = []
    if matches:
        context = "\n\n".join(m["text"] for m in matches if m.get("text"))
        if len(context) > MAX_EXAM_CONTEXT_CHARS:
            context = context[:MAX_EXAM_CONTEXT_CHARS]
            boundary = max(context.rfind("\n\n"), context.rfind(". "))
            if boundary > MAX_EXAM_CONTEXT_CHARS // 2:
                context = context[: boundary + (2 if context[boundary:boundary + 2] == ". " else 0)]
        return context
    return fallback


async def _generate_batch_questions(
    topics: list[str],
    context: str,
    exam_type: str,
    difficulty: str,
    per_topic_count: int,
    exam_history: dict[str, list[str]],
) -> list[dict]:
    topic_lines = []
    for t in topics:
        prior = exam_history.get(t, [])
        line = f'- "{t}": write {per_topic_count} questions.'
        if prior:
            joined = "; ".join(prior[-MAX_PRIOR_QUESTIONS_PER_TOPIC:])
            line += (
                f" Already asked before (write DIFFERENT questions covering other facts or "
                f"angles; only repeat/closely rephrase one if you truly cannot find another "
                f"distinct, accurate question on this topic): {joined}"
            )
        topic_lines.append(line)
    topics_block = "\n".join(topic_lines)

    prompt = f'''Create {difficulty} {exam_type} questions about the following topics, using only the document content below as the source of truth. Allocate questions per topic exactly as specified:
{topics_block}

Return only valid JSON with this shape:
{{"questions":[{{"topic":"...","question":"...","options":[],"correctIndex":0,"explanation":"...","answer":"..."}}]}}
Use a unique short question id for every question, and set "topic" to exactly one of the topic labels above. {_question_shape_instruction(exam_type)}

Document content:
{context}
'''
    response = await llm.generate_completion(
        [
            {"role": "system", "content": "You generate accurate exam questions and return strict JSON only."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=min(2800, max(1200, len(topics) * per_topic_count * 180)),
        temperature=0.6,
        json_mode=True,
    )
    parsed = json.loads(llm.strip_json_fence(response))
    questions = parsed.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ValueError("No valid questions in model response.")
    return questions


async def _generate_batch_bounded(
    semaphore: asyncio.Semaphore,
    topics: list[str],
    context: str,
    exam_type: str,
    difficulty: str,
    per_topic_count: int,
    exam_history: dict[str, list[str]],
) -> list[dict]:
    async with semaphore:
        for attempt in range(2):
            try:
                return await _generate_batch_questions(
                    topics, context, exam_type, difficulty, per_topic_count, exam_history
                )
            except Exception as exc:
                # Broad on purpose: json/shape problems (json.JSONDecodeError,
                # TypeError, ValueError) AND a RateLimitError that survived
                # llm.py's own internal retries both mean the same thing
                # here - this batch didn't come through - and both should be
                # handled the same way: log it, don't crash the whole exam.
                logger.warning(
                    "[exam_service] Batch %s attempt %d failed: %s", topics, attempt + 1, exc
                )
        # One batch failing shouldn't fail the whole exam - the remaining
        # batches (and remaining topics) still go through, and a topic that
        # got skipped this time is just as likely to succeed next
        # generation. This is the direct fix for the old crash, which
        # required every single topic to succeed in one shot.
        logger.error("[exam_service] Giving up on batch %s after retries", topics)
        return []


def _normalize_question(question: dict, exam_type: str) -> dict | None:
    if not isinstance(question, dict) or not str(question.get("question", "")).strip():
        return None
    question = dict(question)
    question["id"] = str(question.get("id") or uuid.uuid4().hex[:10])
    if exam_type == "quiz":
        if (
            not isinstance(question.get("options"), list)
            or len(question["options"]) < 2
            or not isinstance(question.get("correctIndex"), int)
        ):
            return None
    else:
        question["options"] = None
        question["correctIndex"] = None
    return question


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

    context = _document_context(document, use_document)
    if use_document and not context:
        raise BadRequestError("No readable document content is available for this exam.")

    fallback_context = context_builder.get_fallback_context(context)
    exam_history: dict[str, list[str]] = document.get("examHistory") or {}
    requested_topic = (topic or "").strip()

    if requested_topic:
        # A specific topic was requested (not exposed in the current UI,
        # but supported for API callers/future use) - one focused batch,
        # honoring the requested count instead of the per-topic default.
        topic_batches = [[requested_topic]]
        counts = {requested_topic: max(num_questions, 1)}
        exam_topic_label = requested_topic
    else:
        topics = await _ensure_topics(document, context)
        if not topics:
            topics = ["the document"]
        topic_batches = [topics[i : i + TOPICS_PER_BATCH] for i in range(0, len(topics), TOPICS_PER_BATCH)]
        counts = {t: QUESTIONS_PER_TOPIC for t in topics}
        exam_topic_label = "the document"

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_BATCHES)

    async def _run_batch(batch_topics: list[str]) -> list[dict]:
        batch_context = await _batch_context(batch_topics, document_id, user_id, fallback_context, use_document)
        # All topics in a batch share the same per-topic question count in
        # today's two call sites (whole-document exams use QUESTIONS_PER_TOPIC
        # for every topic; a single requested topic is its own batch), so
        # this is safe to read from any topic in the batch.
        per_topic_count = counts[batch_topics[0]]
        return await _generate_batch_bounded(
            semaphore, batch_topics, batch_context, exam_type, difficulty, per_topic_count, exam_history
        )

    batch_results = await asyncio.gather(*[_run_batch(b) for b in topic_batches])

    normalized: list[dict] = []
    newly_asked: dict[str, list[str]] = {}
    for questions in batch_results:
        for raw_question in questions:
            if not isinstance(raw_question, dict):
                logger.warning("[exam_service] Ignoring malformed question item: %r", raw_question)
                continue
            topic_label = str(raw_question.get("topic") or exam_topic_label).strip() or exam_topic_label
            question = _normalize_question(raw_question, exam_type)
            if not question:
                continue
            normalized.append(question)
            newly_asked.setdefault(topic_label, []).append(str(question["question"]))

    if not normalized:
        raise BadRequestError("The exam could not be generated. Please try again.")

    updated_history = dict(exam_history)
    for topic_label, asked in newly_asked.items():
        updated_history[topic_label] = (exam_history.get(topic_label, []) + asked)[-MAX_PRIOR_QUESTIONS_PER_TOPIC:]
    await document_service.update_exam_history(document_id, updated_history)

    exam = {
        "examType": exam_type,
        "topic": exam_topic_label,
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