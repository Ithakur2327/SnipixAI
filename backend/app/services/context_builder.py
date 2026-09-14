import asyncio
import json
import logging
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.services import llm

logger = logging.getLogger(__name__)

# Cap on how many topics we ask the model to extract. Every exam generation
# loops over all of them (see exam_service.generate_exam), so this also
# bounds how many Groq requests a single exam generation can cost - useful
# given the free tier's 1,000-requests/day ceiling, not just its TPM one.
MAX_EXTRACTED_TOPICS = 20

# How many sections we condense with the LLM at the same time. Sequential
# condensation (one section, wait, next section...) is the main reason
# summarizing a large document used to feel slow - a 30-section document at
# ~2s/call took a minute or more. Running them concurrently (bounded so we
# don't blow through Groq rate limits) turns that into a few seconds.
MAX_CONCURRENT_CONDENSATIONS = 2
MAX_SECTION_INPUT_CHARS = 6000


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _split_into_sections(text: str, section_chars: int) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=section_chars,
        chunk_overlap=0,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)


def _trim_at_boundary(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    candidate = text[:max_chars]
    boundary = max(candidate.rfind("\n\n"), candidate.rfind(". "))
    if boundary > max_chars // 2:
        return candidate[: boundary + (1 if candidate[boundary] == "." else 0)].rstrip()
    word_boundary = candidate.rfind(" ")
    return candidate[:word_boundary].rstrip() if word_boundary > 0 else candidate.rstrip()


async def _condense_section(section: str, index: int, total: int, target_words: int) -> str:
    prompt = (
        f"Condense part {index + 1}/{total} into about {target_words} words. Preserve every "
        "topic, fact, number, name, definition, and the reasoning behind each conclusion. "
        "Use only the source text; add no opinions or outside information. Do not drop topics "
        "to shorten it; tighten wording instead. Write dense plain prose without headers.\n\n"
        f"Section text:\n{section[:MAX_SECTION_INPUT_CHARS]}"
    )
    messages = [
        {"role": "system", "content": "Produce an accurate, information-dense document condensation."},
        {"role": "user", "content": prompt},
    ]
    result = await llm.generate_completion(
        messages,
        max_tokens=500,
        temperature=0.2,
        rate_limit_retries=0,
    )
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
    target_words = max(
        180,
        min(
            settings.condensed_section_target_words,
            settings.direct_context_char_budget // max(len(sections), 1) // 5,
        ),
    )
    tasks = [
        _condense_section_bounded(semaphore, section, i, len(sections), target_words)
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
        trimmed = [
            _trim_at_boundary(part, max(40, int(len(part) * overflow_ratio)))
            for part in parts
        ]
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


async def extract_topics(context: str) -> List[str]:
    """List the distinct topics/sections covered in a document, at the
    granularity a table of contents would use.

    This exists specifically because condensed context is written as plain
    prose with no headers (see _condense_section above) - by design, so
    condensation reads naturally - which means topics can't be pattern
    -matched out of it the way they could from a raw document with markdown
    headings. A dedicated extraction call works on any document regardless
    of its original formatting, and is what lets exam generation guarantee
    full topic coverage instead of depending on whatever the model happens
    to include in a single freeform pass.
    """
    cleaned = (context or "").strip()
    if not cleaned:
        return []

    prompt = (
        "List every distinct topic or section covered in the document below, in the order "
        "they appear, at the granularity a table of contents would use - not so broad that "
        "unrelated ideas are lumped together, not so narrow that one idea is split into "
        "several entries. Each topic should be a short, specific label (3-8 words) that "
        "someone could be quizzed on.\n"
        'Return only valid JSON in this shape: {"topics": ["...", "..."]}\n\n'
        f"Document content:\n{cleaned}"
    )
    messages = [
        {"role": "system", "content": "You extract structured topic lists from documents and return strict JSON only."},
        {"role": "user", "content": prompt},
    ]
    try:
        response = await llm.generate_completion(messages, max_tokens=450, temperature=0.2, json_mode=True)
        parsed = json.loads(llm.strip_json_fence(response))
        raw_topics = parsed.get("topics")
        if not isinstance(raw_topics, list):
            return []
    except Exception as exc:
        logger.warning("[context_builder] Topic extraction failed: %s", exc)
        return []

    topics: List[str] = []
    seen = set()
    for item in raw_topics:
        label = str(item).strip().strip("-*# ")
        key = label.lower()
        if 2 <= len(label) <= 120 and key not in seen:
            seen.add(key)
            topics.append(label)
    return topics[:MAX_EXTRACTED_TOPICS]