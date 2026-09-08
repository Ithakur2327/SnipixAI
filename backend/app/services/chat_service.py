import logging
from typing import AsyncGenerator

from app.core.config import get_settings
from app.core.sse import sse_event
from app.services import document_service, embedder, llm, message_service, vector_store

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are SnipixAI, a highly capable document assistant with the conversational quality of ChatGPT. You have been given the full content of a document the user uploaded, along with the most relevant excerpts for their current question.

Core behavior:
- Respond in the same language, script, and tone the user writes in.
- When asked to summarize or explain the document and no specific format is requested, produce a thorough, well-organized, comprehensive response that covers all major points of the document. Never give a short, generic, or artificially truncated answer by default.
- Use clear structure (headings, short paragraphs, and lists) only where it genuinely helps readability. Do not force a rigid template on every answer.
- When the user requests a specific format, length, tone, focus, or style, follow their instructions precisely instead of your default style.
- Ground your answers in the document whenever the question relates to it, referencing specific parts naturally.
- If the user asks something the document does not cover, answer using your own general knowledge like a helpful assistant would, and make it clear when you are going beyond the document.
- Never dead-end with 'the document does not mention this' - always try to be genuinely useful.
- Write using natural Markdown (headings, bold, lists, tables, code blocks for code) where it improves clarity."""


def _build_document_block(title: str, condensed_context: str, excerpts: list[dict]) -> str:
    parts = [f"Document title: {title}", "Document content:", condensed_context]
    if excerpts:
        excerpt_lines = "\n\n".join(f"- {item['text']}" for item in excerpts)
        parts.append("Most relevant excerpts for the current question:")
        parts.append(excerpt_lines)
    return "\n\n".join(parts)


def _history_to_llm_messages(history: list[dict]) -> list[dict]:
    formatted = []
    for msg in history:
        if msg["type"] == "text" and msg.get("content"):
            formatted.append({"role": msg["role"], "content": msg["content"]})
        elif msg["type"] == "exam" and msg.get("exam"):
            topic = msg["exam"].get("topic", "the document")
            exam_type = msg["exam"].get("examType", "quiz")
            formatted.append({"role": "assistant", "content": f"[Generated a {exam_type} exam on {topic}]"})
    return formatted


async def stream_chat_response(user_id: str, document_id: str, user_message: str) -> AsyncGenerator[str, None]:
    settings = get_settings()

    try:
        doc = await document_service.get_document(user_id, document_id)
    except Exception as exc:
        yield sse_event("error", {"message": str(getattr(exc, "message", exc))})
        return

    if doc["status"] != "ready":
        yield sse_event("error", {"message": "This document is still being processed. Please wait a moment."})
        return

    history = await message_service.get_history(document_id, user_id, limit=settings.chat_history_turns)
    await message_service.insert_message(document_id, user_id, "user", "text", content=user_message)

    try:
        query_vector = embedder.embed_query(user_message)
        raw_matches = vector_store.similarity_search(
            query_vector, document_id, user_id, top_k=settings.retrieval_top_k
        )
    except Exception as exc:
        logger.warning("[chat_service] retrieval failed: %s", exc)
        raw_matches = []

    sources = [{"chunkId": m["chunk_id"], "text": m["text"], "score": m["score"]} for m in raw_matches]

    condensed_context = doc.get("condensedContext") or doc.get("rawText") or ""
    document_block = _build_document_block(doc["title"], condensed_context, raw_matches)

    messages = [{"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{document_block}"}]
    messages.extend(_history_to_llm_messages(history))
    messages.append({"role": "user", "content": user_message})

    accumulated = ""
    try:
        async for delta in llm.stream_completion(messages, max_tokens=settings.max_output_tokens):
            accumulated += delta
            yield sse_event("token", {"content": delta})
    except Exception as exc:
        logger.error("[chat_service] streaming failed: %s", exc)
        if accumulated.strip():
            yield sse_event("error", {"message": "The response was interrupted, but here is what was generated."})
        else:
            yield sse_event("error", {"message": "The AI is temporarily unavailable. Please try again."})
    finally:
        if accumulated.strip():
            saved = await message_service.insert_message(
                document_id, user_id, "assistant", "text", content=accumulated, sources=sources
            )
            await document_service.increment_message_count(document_id)
            yield sse_event(
                "done",
                {
                    "messageId": str(saved["_id"]),
                    "sources": sources,
                    "createdAt": saved["createdAt"],
                },
            )


async def get_chat_history(user_id: str, document_id: str) -> list[dict]:
    await document_service.get_document(user_id, document_id)
    history = await message_service.get_history(document_id, user_id)
    return [message_service.to_public(m) for m in history]


async def clear_chat_history(user_id: str, document_id: str) -> None:
    await document_service.get_document(user_id, document_id)
    await message_service.clear_history(document_id, user_id)
