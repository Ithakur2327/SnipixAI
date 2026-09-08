import logging
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings
from app.services import llm

logger = logging.getLogger(__name__)


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


async def build_document_context(raw_text: str) -> str:
    settings = get_settings()
    cleaned = (raw_text or "").strip()

    if not cleaned:
        return ""

    if len(cleaned) <= settings.direct_context_char_budget:
        return cleaned

    sections = _split_into_sections(cleaned, settings.condensed_section_char_size)
    logger.info("[context_builder] Condensing %d sections", len(sections))

    condensed_parts: List[str] = []
    for i, section in enumerate(sections):
        try:
            condensed = await _condense_section(section, i, len(sections), settings.condensed_section_target_words)
            if condensed:
                condensed_parts.append(condensed)
        except Exception as exc:
            logger.error("[context_builder] Failed to condense section %d: %s", i, exc)
            condensed_parts.append(section[: settings.condensed_section_target_words * 6])

    combined = "\n\n".join(condensed_parts)

    if len(combined) > settings.direct_context_char_budget:
        combined = combined[: settings.direct_context_char_budget]

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
