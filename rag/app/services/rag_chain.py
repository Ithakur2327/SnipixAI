import logging
import time
import json
from typing import List
from groq import Groq
from app.core.config import get_settings
from app.models.schemas import OutputType

logger = logging.getLogger(__name__)
settings = get_settings()

_client: Groq = None

SUMMARY_PROMPTS = {
    OutputType.tldr: (
        "Write a 2-4 sentence TL;DR summary. Be crisp and direct. "
        "Return ONLY the summary text, nothing else."
    ),
    OutputType.bullets: (
        "Extract 5-8 key points as a JSON array of strings. "
        'Return ONLY valid JSON like: ["point 1", "point 2"]. No markdown, no explanation.'
    ),
    OutputType.key_insights: (
        "Extract 4-6 strategic insights as a JSON array of strings. "
        'Return ONLY valid JSON like: ["insight 1", "insight 2"]. No markdown.'
    ),
    OutputType.action_points: (
        "List all action items as a JSON array of strings. "
        'Return ONLY valid JSON like: ["action 1", "action 2"]. '
        "Empty array [] if none found. No markdown."
    ),
    OutputType.section_summary: (
        "Identify main sections and summarize each. "
        'Return ONLY valid JSON like: [{"section": "...", "summary": "..."}]. No markdown.'
    ),
}


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def generate_rag_answer(
    question: str,
    chunks: List[dict],
    chat_history: List[dict] = None,
) -> dict:
    """Generate answer from retrieved chunks using Groq (Llama)."""
    start = time.time()
    client = _get_client()
    chat_history = chat_history or []

    context = "\n\n---\n\n".join(
        f"[Chunk {i+1} | Score: {c['score']}]\n{c['text']}"
        for i, c in enumerate(chunks)
    )

    history_str = ""
    if chat_history:
        history_lines = [
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in chat_history[-6:]
        ]
        history_str = "\nConversation history:\n" + "\n".join(history_lines) + "\n"

    system_prompt = (
        "You are SnipixAI, an expert document analyst.\n"
        "Answer ONLY based on the provided context chunks.\n"
        "If the answer is not in the context, say: 'I couldn't find that in the document.'\n"
        "Be concise, use bullet points for lists, never hallucinate."
    )

    user_prompt = (
        f"Context chunks:\n{context}\n"
        f"{history_str}\n"
        f"Question: {question}\n\n"
        f"Answer:"
    )

    response = client.chat.completions.create(
        model=settings.groq_chat_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=1500,
    )

    answer = response.choices[0].message.content.strip()
    ms = int((time.time() - start) * 1000)
    usage = response.usage

    sources = [
        {
            "chunk_id":   c["chunk_id"],
            "chunk_text": c["text"][:300],
            "score":      c["score"],
        }
        for c in chunks
    ]

    logger.info(f"[rag_chain] RAG answer generated in {ms}ms")

    return {
        "answer":        answer,
        "model":         settings.groq_chat_model,
        "processing_ms": ms,
        "sources":       sources,
        "token_usage": {
            "prompt":     usage.prompt_tokens if usage else 0,
            "completion": usage.completion_tokens if usage else 0,
            "total":      usage.total_tokens if usage else 0,
        },
    }


def generate_summary(raw_text: str, output_type: OutputType) -> dict:
    """Generate summary of document using Groq (Llama)."""
    start = time.time()
    client = _get_client()

    # ✅ FIX: Groq free tier TPM limit 12000 hai
    # 1 token ≈ 4 chars, system+task prompt ≈ 200 tokens
    # Safe limit: ~9000 tokens content = ~36000 chars
    MAX_CHARS = 36_000
    text = raw_text[:MAX_CHARS]
    if len(raw_text) > MAX_CHARS:
        logger.warning(
            f"[rag_chain] Text truncated from {len(raw_text)} to {MAX_CHARS} chars "
            f"to stay within Groq TPM limit"
        )

    task_prompt = SUMMARY_PROMPTS[output_type]

    response = client.chat.completions.create(
        model=settings.groq_chat_model,
        messages=[
            {
                "role": "system",
                "content": "You are an expert document summarizer. Follow the output format exactly.",
            },
            {
                "role": "user",
                "content": f"Document:\n\n{text}\n\nTask: {task_prompt}",
            },
        ],
        temperature=0.1,
        max_tokens=1000,  # ✅ FIX: 2000 → 1000, output tokens bhi TPM mein count hote hain
    )

    raw = response.choices[0].message.content.strip()
    ms = int((time.time() - start) * 1000)
    usage = response.usage

    if output_type == OutputType.tldr:
        content = raw
    else:
        try:
            cleaned = raw.replace("```json", "").replace("```", "").strip()
            content = json.loads(cleaned)
        except json.JSONDecodeError:
            content = [
                line.lstrip("-•* ").strip()
                for line in raw.splitlines()
                if line.strip()
            ]

    logger.info(f"[rag_chain] Summary ({output_type}) generated in {ms}ms")

    return {
        "content":            content,
        "model":              settings.groq_chat_model,
        "processing_time_ms": ms,
        "token_usage": {
            "prompt":     usage.prompt_tokens if usage else 0,
            "completion": usage.completion_tokens if usage else 0,
            "total":      usage.total_tokens if usage else 0,
        },
    }