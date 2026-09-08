import logging
from typing import AsyncGenerator, List

from groq import AsyncGroq

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncGroq | None = None


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client


async def stream_completion(
    messages: List[dict],
    max_tokens: int | None = None,
    temperature: float = 0.6,
) -> AsyncGenerator[str, None]:
    settings = get_settings()
    client = get_client()
    stream = await client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens or settings.max_output_tokens,
        stream=True,
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


async def generate_completion(
    messages: List[dict],
    max_tokens: int | None = None,
    temperature: float = 0.4,
    json_mode: bool = False,
) -> str:
    settings = get_settings()
    client = get_client()
    kwargs = dict(
        model=settings.groq_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens or settings.max_output_tokens,
        stream=False,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        response = await client.chat.completions.create(**kwargs)
    except Exception as exc:
        if json_mode:
            logger.warning("[llm] json_object mode failed, retrying without it: %s", exc)
            kwargs.pop("response_format", None)
            response = await client.chat.completions.create(**kwargs)
        else:
            raise
    return response.choices[0].message.content or ""
