from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship
import uuid
from datetime import datetime
from pydantic import BaseModel
from pydantic import ConfigDict
from typing import List, Optional, Any

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    lectures = relationship("Lecture", back_populates="user", cascade="all, delete-orphan")

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
    quiz = Column(JSON, nullable=True)        # Array of {question: str, options: List[str], correct_answer_index: int}

    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    user = relationship("User", back_populates="lectures")

# Pydantic Schemas
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

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
    quiz: Optional[List[Any]] = None
    created_at: Optional[datetime] = None
    user_id: Optional[str] = None
