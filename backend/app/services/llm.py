import asyncio
import logging
import re
from typing import AsyncGenerator, List

from groq import AsyncGroq, RateLimitError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncGroq | None = None

# Groq's on-demand tier enforces a small tokens-per-minute (TPM) quota per
# model (e.g. 8000 TPM for openai/gpt-oss-20b). Document ingestion
# (context_builder's concurrent section condensation) and exam generation
# draw from that same per-minute budget as chat, so a document that just
# finished processing can leave the very next chat request without enough
# headroom even though nothing is actually broken. Groq's 429 response tells
# us exactly how long the window needs to drain via the `retry-after` /
# `retry-after-ms` headers.
#
# Kept deliberately short: on this account tier, Groq's own suggested wait
# is sometimes 20-35s, and retrying for that long *every* time a call
# collides with another one defeats the goal of a snappy product - it's
# often better to fail fast with a clear "try again in a moment" than to
# make one request silently eat 30-70+ seconds trying to force success.
MAX_RATE_LIMIT_RETRIES = 0
MAX_RATE_LIMIT_WAIT_SECONDS = 45.0
DEFAULT_RATE_LIMIT_WAIT_SECONDS = 3.0


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncGroq(api_key=settings.groq_api_key, max_retries=0)
    return _client


def _retry_after_seconds(exc: RateLimitError) -> float:
    """Read Groq's reported wait time off a 429 response, falling back to a
    short default if the header is missing or unparsable."""
    headers = getattr(getattr(exc, "response", None), "headers", None)
    if headers:
        ms = headers.get("retry-after-ms")
        if ms is not None:
            try:
                return max(0.0, float(ms) / 1000)
            except ValueError:
                pass
        seconds = headers.get("retry-after")
        if seconds is not None:
            try:
                return max(0.0, float(seconds))
            except ValueError:
                pass
    match = re.search(r"try again in\s+([\d.]+)s", str(exc), re.IGNORECASE)
    if match:
        return max(0.0, float(match.group(1)))
    return DEFAULT_RATE_LIMIT_WAIT_SECONDS


def _is_daily_limit(exc: RateLimitError) -> bool:
    """Daily token quotas cannot recover by retrying this request."""
    error = getattr(exc, "body", None) or getattr(exc, "response", None)
    text = str(error or exc).lower()
    return "tokens per day" in text or '"code":"rate_limit_exceeded"' in text and "day" in text


def rate_limit_retry_seconds(exc: RateLimitError) -> float:
    """Return the provider's suggested retry delay when it is in the error text."""
    match = re.search(r"try again in\s+([\d.]+)s", str(exc), re.IGNORECASE)
    if match:
        return max(1.0, round(float(match.group(1))))
    return round(_retry_after_seconds(exc))


def is_daily_rate_limit(exc: RateLimitError) -> bool:
    return _is_daily_limit(exc)


async def _create_with_rate_limit_retry(
    client: AsyncGroq, max_retries: int = MAX_RATE_LIMIT_RETRIES, **kwargs
):
    """Wrapper around client.chat.completions.create that transparently
    retries Groq 429s using the wait time Groq itself reports.

    Safe for streaming calls too: with stream=True the initial `create()`
    call is what raises on a 429 (it's the request/response handshake) - no
    chunks have been produced yet - so retrying here never yields duplicate
    or out-of-order content downstream.
    """
    attempt = 0
    while True:
        try:
            return await client.chat.completions.create(**kwargs)
        except RateLimitError as exc:
            if _is_daily_limit(exc):
                logger.error("[llm] Groq daily token limit reached; failing fast")
                raise
            attempt += 1
            if attempt > max_retries:
                raise
            wait_s = min(_retry_after_seconds(exc), MAX_RATE_LIMIT_WAIT_SECONDS)
            logger.warning(
                "[llm] Groq rate limit hit, retrying in %.1fs (attempt %d/%d)",
                wait_s,
                attempt,
                max_retries,
            )
            await asyncio.sleep(wait_s)


async def stream_completion(
    messages: List[dict],
    max_tokens: int | None = None,
    temperature: float = 0.6,
    stream_status: dict | None = None,
    rate_limit_retries: int = MAX_RATE_LIMIT_RETRIES,
) -> AsyncGenerator[str, None]:
    settings = get_settings()
    client = get_client()
    stream = await _create_with_rate_limit_retry(
        client,
        max_retries=rate_limit_retries,
        model=settings.groq_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens or settings.max_output_tokens,
        stream=True,
        reasoning_effort=settings.groq_reasoning_effort,
        reasoning_format=settings.groq_reasoning_format,
    )
    completed = False
    async for chunk in stream:
        if not chunk.choices:
            continue
        finish_reason = chunk.choices[0].finish_reason
        if finish_reason:
            completed = finish_reason == "stop"
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
    if stream_status is not None:
        stream_status["complete"] = completed


async def generate_completion(
    messages: List[dict],
    max_tokens: int | None = None,
    temperature: float = 0.4,
    json_mode: bool = False,
    rate_limit_retries: int | None = None,
) -> str:
    settings = get_settings()
    client = get_client()
    kwargs = dict(
        model=settings.groq_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens or settings.max_output_tokens,
        stream=False,
        reasoning_effort=settings.groq_reasoning_effort,
        reasoning_format=settings.groq_reasoning_format,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        response = await _create_with_rate_limit_retry(
            client,
            max_retries=MAX_RATE_LIMIT_RETRIES if rate_limit_retries is None else rate_limit_retries,
            **kwargs,
        )
    except RateLimitError:
        # Already retried internally (see _create_with_rate_limit_retry) -
        # falling back to "retry without json_mode" here would just hit the
        # exact same rate limit again for no benefit, doubling how long a
        # single call can take. Let the caller handle it (exam_service and
        # context_builder both already treat a failed call as "skip this
        # piece, don't crash the whole request").
        raise
    except Exception as exc:
        if json_mode:
            logger.warning("[llm] json_object mode failed, retrying without it: %s", exc)
            kwargs.pop("response_format", None)
            response = await _create_with_rate_limit_retry(
                client,
                max_retries=MAX_RATE_LIMIT_RETRIES if rate_limit_retries is None else rate_limit_retries,
                **kwargs,
            )
        else:
            raise
    content = response.choices[0].message.content or ""
    if not content.strip():
        # Defensive fallback: on rare occasions a reasoning model still
        # answers inside the reasoning trace instead of the visible
        # content, even with reasoning_format="hidden". If that ever
        # slips through, surface a clear error instead of silently
        # returning an empty string that fails JSON parsing downstream
        # with a confusing message.
        logger.warning("[llm] Model returned empty content for a non-streaming request")
    return content


def strip_json_fence(content: str) -> str:
    """Strip a ```json ... ``` (or bare ```...```) fence some models wrap
    JSON output in, even when json_mode is requested. Shared by any caller
    that parses a JSON completion (exam_service, context_builder)."""
    cleaned = content.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines.pop()
        cleaned = "\n".join(lines).strip()
    return cleaned