from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    plan: str
    avatarUrl: Optional[str] = None
    createdAt: datetime


class AuthData(BaseModel):
    user: UserPublic
    token: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    avatarUrl: Optional[str] = None


class UsageData(BaseModel):
    plan: str
    documentsUsed: int
    documentsLimit: int
    aiRequestsUsedToday: int
    aiRequestsLimit: int


class CreateFromUrlRequest(BaseModel):
    url: str
    title: Optional[str] = None


class CreateFromTextRequest(BaseModel):
    text: str = Field(min_length=1)
    title: Optional[str] = None


class DocumentPublic(BaseModel):
    id: str
    title: str
    sourceType: str
    status: str
    wordCount: Optional[int] = None
    pageCount: Optional[int] = None
    messageCount: int = 0
    errorMessage: Optional[str] = None
    fileUrl: Optional[str] = None
    mimeType: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


class DocumentListData(BaseModel):
    documents: list[DocumentPublic]
    total: int


class SendMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    continuation: bool = False


class MessageSource(BaseModel):
    chunkId: str
    text: str
    score: float


class ExamQuestion(BaseModel):
    id: str
    question: str
    options: Optional[list[str]] = None
    correctIndex: Optional[int] = None
    explanation: Optional[str] = None
    answer: Optional[str] = None


class ExamScore(BaseModel):
    correct: int
    total: int


class ExamData(BaseModel):
    examType: Literal["quiz", "subjective"]
    topic: str
    questions: list[ExamQuestion]
    userAnswers: dict[str, int] = Field(default_factory=dict)
    submitted: bool = False
    revealed: dict[str, bool] = Field(default_factory=dict)
    score: Optional[ExamScore] = None


class MessagePublic(BaseModel):
    id: str
    documentId: str
    role: Literal["user", "assistant"]
    type: Literal["text", "exam"]
    content: Optional[str] = None
    sources: list[MessageSource] = Field(default_factory=list)
    exam: Optional[ExamData] = None
    createdAt: datetime


class GenerateExamRequest(BaseModel):
    examType: Literal["quiz", "subjective"]
    topic: Optional[str] = Field(default=None, max_length=200)
    useDocument: bool = True
    numQuestions: int = Field(default=5, ge=1, le=20)
    difficulty: Optional[Literal["easy", "medium", "hard"]] = "medium"


class SubmitQuizAnswersRequest(BaseModel):
    answers: dict[str, int]


class RevealAnswerRequest(BaseModel):
    questionId: str
    revealed: bool = True
