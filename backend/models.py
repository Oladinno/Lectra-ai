from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.orm import DeclarativeBase
import uuid
from datetime import datetime
from pydantic import BaseModel
from pydantic import ConfigDict
from typing import List, Optional, Any

class Base(DeclarativeBase):
    pass

class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False, default="Untitled Lecture")
    audio_url = Column(String, nullable=False)
    status = Column(String, nullable=False, default="processing")  # pending, processing, completed, failed
    error_message = Column(String, nullable=True)
    duration = Column(String, nullable=True)  # e.g., "45:12"
    accuracy = Column(String, nullable=True)  # e.g., "98%"

    transcript = Column(JSON, nullable=True)  # Array of {time: str, text: str}
    summary = Column(JSON, nullable=True)     # Array of strings
    notes = Column(JSON, nullable=True)       # Array of {title: str, bullets: List[str]}
    flashcards = Column(JSON, nullable=True)  # Array of {q: str, a: str}

    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Schemas
class LectureBase(BaseModel):
    title: str
    audio_url: str

class LectureCreate(LectureBase):
    pass

class LectureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    audio_url: str
    status: str
    error_message: Optional[str] = None
    duration: Optional[str] = None
    accuracy: Optional[str] = None
    transcript: Optional[List[Any]] = None
    summary: Optional[List[str]] = None
    notes: Optional[List[Any]] = None
    flashcards: Optional[List[Any]] = None
    created_at: Optional[datetime] = None
