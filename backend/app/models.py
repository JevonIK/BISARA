from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    progress: Mapped["UserProgress"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )


class UserProgress(Base):
    __tablename__ = "user_progress"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
    )
    xp: Mapped[int] = mapped_column(Integer, default=0)
    revision: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    streak: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_missions: Mapped[int] = mapped_column(Integer, default=0)
    completed_mission_ids: Mapped[list[str]] = mapped_column(JSONB, default=list)
    mastered_signs: Mapped[int] = mapped_column(Integer, default=0)
    total_practice_minutes: Mapped[int] = mapped_column(Integer, default=0)
    best_chapter_score: Mapped[int] = mapped_column(Integer, default=0)
    best_gesture_score: Mapped[int] = mapped_column(Integer, default=0)
    last_chapter_score: Mapped[int] = mapped_column(Integer, default=0)
    chapter_one_stars: Mapped[int] = mapped_column(Integer, default=0)
    test_attempts: Mapped[int] = mapped_column(Integer, default=0)
    gesture_attempts: Mapped[int] = mapped_column(Integer, default=0)
    conversation_completions: Mapped[int] = mapped_column(Integer, default=0)
    mission_scores: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict)
    conversation_completions_by_mission: Mapped[dict[str, int]] = mapped_column(
        JSONB, default=dict
    )
    sign_mastery: Mapped[dict[str, dict[str, int | bool | str]]] = mapped_column(
        JSONB, default=dict
    )
    review_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reviewed_signs: Mapped[list[str]] = mapped_column(JSONB, default=list)
    weekly_activity: Mapped[list[dict[str, int | str]]] = mapped_column(JSONB, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[User] = relationship(back_populates="progress")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
