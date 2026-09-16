import logging
from typing import AsyncGenerator

from groq import RateLimitError

from app.core.config import get_settings
from app.core.sse import sse_event
from app.services import context_builder, document_service, embedder, llm, message_service, vector_store

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are SnipixAI, a highly capable document assistant with the conversational quality of ChatGPT. You have been given the full content of a document the user uploaded, along with the most relevant excerpts for their current question.

Core behavior:
- Respond in the same language, script, and tone the user writes in.
- When asked to summarize or explain the document and no specific format is requested, walk through every topic and section present in the document content below, in the order they appear - do not skip, merge, or compress sections just to make the answer shorter. For each point, explain the reasoning, context, or "why" behind it, not just the bare fact in isolation. Never give a short, generic, or artificially truncated answer by default.
- For a long summary, stop only after completing the current topic or section; never end halfway through a topic. A later continuation must begin with the next unfinished topic or section.
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


# Keeping more history turns (settings.chat_history_turns) helps the model
# stay coherent across a long, continuation-chained summary instead of
# losing track of what it already covered - but a long continuation chain
# means older turns can each be up to max_output_tokens long, and blindly
# including all of them at full length would let a single request's input
# alone blow past Groq's per-minute token quota with no way for a retry to
# fix it (unlike a transient burst, a request that's structurally too big
# just fails outright). Only the most recent turn is kept at full length -
# it's the one continuation needs to anchor on exactly - older turns are
# shortened to their gist.
MAX_HISTORY_MESSAGE_CHARS = 1200
KEEP_FULL_LAST_TURNS = 2
MAX_CHAT_DOCUMENT_CHARS = 6000
MAX_CHAT_COMPLETION_TOKENS = 1200


def _truncate_history_text(text: str) -> str:
    if len(text) <= MAX_HISTORY_MESSAGE_CHARS:
        return text
    return text[:MAX_HISTORY_MESSAGE_CHARS].rstrip() + "\n[...older content shortened for context...]"


def _history_to_llm_messages(history: list[dict]) -> list[dict]:
    formatted = []
    total = len(history)
    for idx, msg in enumerate(history):
        keep_full = idx >= total - KEEP_FULL_LAST_TURNS
        if msg["type"] == "text" and msg.get("content"):
            content = msg["content"] if keep_full else _truncate_history_text(msg["content"])
            formatted.append({"role": msg["role"], "content": content})
        elif msg["type"] == "exam" and msg.get("exam"):
            topic = msg["exam"].get("topic", "the document")
            exam_type = msg["exam"].get("examType", "quiz")
            formatted.append({"role": "assistant", "content": f"[Generated a {exam_type} exam on {topic}]"})
    return formatted


async def stream_chat_response(
    user_id: str,
    document_id: str,
    user_message: str,
    continuation: bool = False,
    skip_retrieval: bool = False,
) -> AsyncGenerator[str, None]:
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
    if not continuation:
        await message_service.insert_message(document_id, user_id, "user", "text", content=user_message)
    else:
        # Anchor on the literal tail of what was already written instead of
        # a generic "continue where you left off" instruction. The prior
        # partial response is already the last turn in `history` below, but
        # calling out its exact ending text explicitly - and telling the
        # model whether it needs to finish a sentence/word mid-way rather
        # than start a fresh one - is what actually makes the seam
        # invisible instead of leaving a repeated phrase or a restarted
        # paragraph at the join.
        last_assistant_text = ""
        for msg in reversed(history):
            if msg["role"] == "assistant" and msg["type"] == "text" and msg.get("content"):
                last_assistant_text = msg["content"]
                break
        tail = last_assistant_text[-400:]
        user_message = (
            "Your previous response was cut off before it was finished. Here is the exact "
            f"tail end of what you already wrote, verbatim:\n\n\"...{tail}\"\n\n"
            "Continue writing starting immediately after that exact text. If it stops "
            "mid-sentence or mid-word, finish that same sentence/word first - do not start a "
            "new sentence. Do not repeat any text already written above, do not add a "
            "transition phrase like 'continuing from before', a new heading, or a fresh "
            "introduction. For a document summary, always finish the current topic or section "
            "before stopping; never end halfway through a topic. Keep going until every "
            "remaining topic and section is fully covered."
        )

    if skip_retrieval:
        raw_matches = []
    else:
        try:
            query_vector = await embedder.embed_query_async(user_message)
            raw_matches = await vector_store.similarity_search_async(
                query_vector, document_id, user_id, top_k=settings.retrieval_top_k
            )
        except Exception as exc:
            logger.warning("[chat_service] retrieval failed: %s", exc)
            raw_matches = []

    sources = [{"chunkId": m["chunk_id"], "text": m["text"], "score": m["score"]} for m in raw_matches]

    condensed_context = context_builder.get_fallback_context(
        doc.get("condensedContext") or doc.get("rawText") or ""
    )
    if len(condensed_context) > MAX_CHAT_DOCUMENT_CHARS:
        condensed_context = context_builder._trim_at_boundary(
            condensed_context, MAX_CHAT_DOCUMENT_CHARS
        )
    document_block = _build_document_block(doc["title"], condensed_context, raw_matches)

    messages = [{"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{document_block}"}]
    messages.extend(_history_to_llm_messages(history))
    messages.append({"role": "user", "content": user_message})

    accumulated = ""
    interrupted = False
    stream_status: dict = {"complete": False}
    try:
        async for delta in llm.stream_completion(
            messages,
            max_tokens=min(settings.max_output_tokens, MAX_CHAT_COMPLETION_TOKENS),
            stream_status=stream_status,
            rate_limit_retries=0,
        ):
            accumulated += delta
            yield sse_event("token", {"content": delta})
    except Exception as exc:
        interrupted = True
        logger.error("[chat_service] streaming failed: %s", exc)
        if accumulated.strip():
            yield sse_event("error", {"message": "The response was interrupted, but here is what was generated."})
        elif isinstance(exc, RateLimitError):
            # The LLM layer fails fast for exhausted daily quotas and does not
            # make the user wait through retries that cannot succeed today.
            if llm.is_daily_rate_limit(exc):
                message = "Today's AI usage limit has been reached. Please try again after the Groq quota resets."
            else:
                retry_seconds = llm.rate_limit_retry_seconds(exc)
                message = f"The AI is temporarily busy. Please try again in about {retry_seconds} seconds."
            yield sse_event("error", {"message": message})
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
                    "complete": not interrupted and stream_status["complete"],
                },
            )


async def get_chat_history(user_id: str, document_id: str) -> list[dict]:
    await document_service.get_document(user_id, document_id)
    history = await message_service.get_history(document_id, user_id)
    return [message_service.to_public(m) for m in history]


async def clear_chat_history(user_id: str, document_id: str) -> None:
    await document_service.get_document(user_id, document_id)
    await message_service.clear_history(document_id, user_id)