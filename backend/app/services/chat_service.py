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
- When asked to summarize or explain the document and no specific format is requested, cover every topic and section visible in the provided document windows in their original order. Do not skip, merge, or compress topics merely to make the answer shorter. Give the maximum useful detail: definitions, facts, numbers, examples, relationships, reasoning, and conclusions. Never give a short, generic, or artificially truncated answer by default.
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
MAX_CHAT_DOCUMENT_CHARS = 8000
MAX_CHAT_COMPLETION_TOKENS = 1800
MIN_CHAT_COMPLETION_TOKENS = 400
CHAT_TPM_BUDGET = 8000
MAX_SUMMARY_SEGMENT_CHARS = 7000
LEGACY_CONTINUATION_NOTICE = "\n\n[Summary abhi complete nahi hui hai. Aage continue karne ke liye input me continue likhein.]"


def _summary_segment_size(document_length: int, detailed: bool = False) -> int:
    """Size summary passes for roughly 2 parts by default, or 5 for a
    requested detailed summary, while keeping each request small enough for
    Groq's free TPM limit.
    """
    if document_length <= 0:
        return MAX_SUMMARY_SEGMENT_CHARS
    target_parts = 5 if detailed else 2
    return min(MAX_SUMMARY_SEGMENT_CHARS, max(1, -(-document_length // target_parts)))


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
            content = content.removesuffix(LEGACY_CONTINUATION_NOTICE)
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
    continuation_message_id: str | None = None
    continuation_prefix = ""
    is_summary_request = continuation or user_message.strip().lower() == "summarize this document for me."
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
                continuation_message_id = str(msg["_id"])
                break
            last_assistant_text = last_assistant_text.removesuffix(LEGACY_CONTINUATION_NOTICE)
        continuation_prefix = last_assistant_text
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

    if skip_retrieval or is_summary_request:
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

    raw_document = doc.get("rawText") or doc.get("condensedContext") or ""
    summary_instruction = (doc.get("summaryInstruction") or "").strip()
    detailed_summary = bool(summary_instruction and any(
        word in summary_instruction.lower()
        for word in ("detail", "detailed", "deep", "thorough", "example", "explain")
    ))
    if is_summary_request:
        summary_cursor = int(doc.get("summaryCursor") or 0)
        if continuation:
            summary_cursor = min(summary_cursor, len(raw_document))
        else:
            summary_cursor = 0
        summary_segment_size = _summary_segment_size(len(raw_document), detailed_summary)
        segment_end = min(summary_cursor + summary_segment_size, len(raw_document))
        condensed_context = raw_document[summary_cursor:segment_end].strip()
        if summary_cursor >= len(raw_document):
            condensed_context = "The document has already been fully covered in the previous summary."
    else:
        condensed_context = context_builder.get_fallback_context(raw_document, MAX_CHAT_DOCUMENT_CHARS)
    document_block = _build_document_block(doc["title"], condensed_context, raw_matches)

    instruction_block = ""
    if summary_instruction:
        instruction_block = (
            "\n\nUser's summary preference (follow this while preserving complete topic coverage):\n"
            f"{summary_instruction}"
        )
    messages = [{"role": "system", "content": f"{SYSTEM_PROMPT}{instruction_block}\n\n{document_block}"}]
    if not is_summary_request:
        messages.extend(_history_to_llm_messages(history))
    elif continuation:
        messages.append({"role": "assistant", "content": continuation_prefix[-1200:]})
    if is_summary_request:
        detail_mode = detailed_summary
        summary_task = (
            "Summarize this exact document segment in order. Cover every topic, heading, fact, "
            "definition, number, example, relationship, and conclusion in this segment. "
            "Do not skip any topic or invent information. "
            + ("Explain each point thoroughly with examples and reasoning. " if detail_mode else "Keep it complete and information-dense. ")
            + "This is one segment of a larger document; finish the current topic before stopping."
        )
        messages.append({"role": "user", "content": summary_task})
    else:
        messages.append({"role": "user", "content": user_message})

    # Groq's TPM limit counts the prompt and the requested completion
    # together. Keep enough headroom for a previous request in the same
    # rolling minute instead of sending a request that is valid by itself
    # but guaranteed to 429 after recent usage.
    estimated_input_tokens = max(
        1,
        sum(len(str(message.get("content", ""))) for message in messages) // 4,
    )
    available_completion_tokens = max(
        MIN_CHAT_COMPLETION_TOKENS,
        CHAT_TPM_BUDGET - estimated_input_tokens - 600,
    )
    chat_completion_tokens = min(MAX_CHAT_COMPLETION_TOKENS, available_completion_tokens)

    accumulated = ""
    interrupted = False
    next_cursor = int(doc.get("summaryCursor") or 0)
    stream_status: dict = {"complete": False}
    try:
        async for delta in llm.stream_completion(
            messages,
            max_tokens=min(settings.max_output_tokens, chat_completion_tokens),
            stream_status=stream_status,
            # One quick, bounded retry instead of failing instantly on the
            # first 429 - capped generously enough (see
            # llm.CHAT_RATE_LIMIT_WAIT_SECONDS) that when Groq reports a
            # real wait (e.g. ~18s after a big continuation request collides
            # with the window a large summary just used), the retry
            # actually waits long enough to succeed instead of retrying too
            # early and failing again. Daily-quota exhaustion still fails
            # immediately either way (see _create_with_rate_limit_retry's
            # own check for that).
            rate_limit_retries=1,
            max_wait_seconds=8.0,
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
            saved_content = continuation_prefix + accumulated
            if is_summary_request and not interrupted and stream_status["complete"]:
                summary_cursor = int(doc.get("summaryCursor") or 0)
                next_cursor = min(summary_cursor + summary_segment_size, len(raw_document))
                await document_service.update_summary_cursor(document_id, next_cursor)
            if continuation and continuation_message_id:
                saved = await message_service.update_text_message(
                    continuation_message_id, user_id, saved_content, sources=sources
                )
            else:
                saved = await message_service.insert_message(
                    document_id, user_id, "assistant", "text", content=saved_content, sources=sources
                )
                await document_service.increment_message_count(document_id)
            yield sse_event(
                "done",
                {
                    "messageId": str(saved["_id"]),
                    "sources": sources,
                    "createdAt": saved["createdAt"],
                    "complete": (
                        not interrupted
                        and stream_status["complete"]
                        and (not is_summary_request or next_cursor >= len(raw_document))
                    ),
                    "continuationAvailable": is_summary_request and next_cursor < len(raw_document),
                },
            )


async def get_chat_history(user_id: str, document_id: str) -> list[dict]:
    await document_service.get_document(user_id, document_id)
    history = await message_service.get_history(document_id, user_id)
    return [message_service.to_public(m) for m in history]


async def clear_chat_history(user_id: str, document_id: str) -> None:
    await document_service.get_document(user_id, document_id)
    await message_service.clear_history(document_id, user_id)