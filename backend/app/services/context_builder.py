import asyncio
import logging
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.services import llm

logger = logging.getLogger(__name__)

# How many sections we condense with the LLM at the same time. Sequential
# condensation (one section, wait, next section...) is the main reason
# summarizing a large document used to feel slow - a 30-section document at
# ~2s/call took a minute or more. Running them concurrently (bounded so we
# don't blow through Groq rate limits) turns that into a few seconds.
MAX_CONCURRENT_CONDENSATIONS = 6


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _split_into_sections(text: str, section_chars: int) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=section_chars,
        chunk_overlap=min(300, section_chars // 10),
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


async def _condense_section(section: str, index: int, total: int, target_words: int) -> str:
    prompt = (
        f"You are condensing part {index + 1} of {total} of a longer document into a dense, "
        f"faithful reference summary of about {target_words} words. Preserve concrete facts, "
        "numbers, names, definitions, and conclusions. Do not add opinions or information that "
        "is not present in the text. Write plain prose, no headers.\n\n"
        f"Section text:\n{section}"
    )
    messages = [
        {"role": "system", "content": "You produce accurate, information-dense condensations of text for later use as reference context."},
        {"role": "user", "content": prompt},
    ]
    result = await llm.generate_completion(messages, max_tokens=600, temperature=0.2)
    return result.strip()


async def _condense_section_bounded(
    semaphore: asyncio.Semaphore,
    section: str,
    index: int,
    total: int,
    target_words: int,
) -> str:
    async with semaphore:
        try:
            condensed = await _condense_section(section, index, total, target_words)
            return condensed or section[: target_words * 6]
        except Exception as exc:
            logger.error("[context_builder] Failed to condense section %d: %s", index, exc)
            # Fall back to a raw truncated slice of that section so one failed
            # LLM call doesn't drop content or fail the whole document.
            return section[: target_words * 6]


async def build_document_context(raw_text: str) -> str:
    settings = get_settings()
    cleaned = (raw_text or "").strip()

    if not cleaned:
        return ""

    if len(cleaned) <= settings.direct_context_char_budget:
        return cleaned

    sections = _split_into_sections(cleaned, settings.condensed_section_char_size)
    logger.info(
        "[context_builder] Condensing %d sections (up to %d concurrently)",
        len(sections),
        MAX_CONCURRENT_CONDENSATIONS,
    )

    # Condense sections concurrently (bounded by a semaphore) instead of
    # awaiting them one-by-one. asyncio.gather preserves input order, so the
    # combined summary still reads front-to-back correctly.
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_CONDENSATIONS)
    tasks = [
        _condense_section_bounded(semaphore, section, i, len(sections), settings.condensed_section_target_words)
        for i, section in enumerate(sections)
    ]
    condensed_parts = await asyncio.gather(*tasks)
    parts = [part for part in condensed_parts if part]
    combined = "\n\n".join(parts)

    if len(combined) > settings.direct_context_char_budget:
        # Only the most extreme documents hit this now that the budget is
        # much larger. Trim proportionally across every section instead of
        # just chopping off the tail, so every topic keeps at least some
        # representation instead of later ones disappearing entirely.
        overflow_ratio = settings.direct_context_char_budget / len(combined)
        trimmed = [part[: max(40, int(len(part) * overflow_ratio))] for part in parts]
        combined = "\n\n".join(trimmed)

    return combined


def get_fallback_context(raw_text: str) -> str:
    settings = get_settings()
    cleaned = (raw_text or "").strip()
    if len(cleaned) <= settings.direct_context_char_budget:
        return cleaned

    half = settings.direct_context_char_budget // 2
    head = cleaned[:half]
    tail = cleaned[-half:]
    return f"{head}\n\n[...middle of document omitted while full analysis finishes...]\n\n{tail}"
