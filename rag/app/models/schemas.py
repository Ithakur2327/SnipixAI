from pydantic import BaseModel, Field
from typing import Optional, List, Any
from enum import Enum


class OutputType(str, Enum):
    tldr = "tldr"
    bullets = "bullets"
    key_insights = "key_insights"
    action_points = "action_points"
    section_summary = "section_summary"


class SourceType(str, Enum):
    pdf = "pdf"
    docx = "docx"
    ppt = "ppt"
    txt = "txt"
    url = "url"
    image = "image"
    raw_text = "raw_text"


# ── Request schemas ──

class ProcessDocumentRequest(BaseModel):
    document_id: str
    user_id: str
    source_type: SourceType
    source_url: Optional[str] = None
    raw_text: Optional[str] = None


class SummarizeRequest(BaseModel):
    document_id: str
    raw_text: str
    output_type: OutputType


class ChatRequest(BaseModel):
    document_id: str
    user_id: str
    question: str
    chat_history: List[dict] = []
    top_k: int = 5


# ── Response schemas ──

class ChunkSource(BaseModel):
    chunk_id: str
    chunk_text: str
    score: float


class SummarizeResponse(BaseModel):
    content: Any
    model: str
    processing_time_ms: int
    token_usage: dict


class ChatResponse(BaseModel):
    answer: str
    model: str
    processing_ms: int
    sources: List[ChunkSource]


class ProcessResponse(BaseModel):
    document_id: str
    status: str
    chunks_created: int = 0
    message: str = ""


class HealthResponse(BaseModel):
    status: str
    pinecone: str
    mongodb: str
    openai: str