from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(word.capitalize() for word in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )


class RegisterRequest(ApiModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("display_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least two characters")
        return value


class LoginRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(ApiModel):
    id: UUID
    email: EmailStr
    display_name: str
    created_at: datetime


class WeeklyActivityItem(ApiModel):
    day: str = Field(min_length=1, max_length=12)
    minutes: int = Field(ge=0, le=1440)


class ProgressUpdate(ApiModel):
    xp: int = Field(ge=0, le=10_000_000)
    streak: int = Field(ge=0, le=100_000)
    last_active_date: date | None = None
    completed_missions: int = Field(ge=0, le=10_000)
    mastered_signs: int = Field(ge=0, le=10_000)
    total_practice_minutes: int = Field(ge=0, le=10_000_000)
    best_chapter_score: int = Field(ge=0, le=100)
    best_gesture_score: int = Field(ge=0, le=100)
    last_chapter_score: int = Field(ge=0, le=100)
    chapter_one_stars: int = Field(ge=0, le=3)
    test_attempts: int = Field(ge=0, le=1_000_000)
    gesture_attempts: int = Field(ge=0, le=1_000_000)
    conversation_completions: int = Field(ge=0, le=1_000_000)
    review_date: date | None = None
    reviewed_signs: list[str] = Field(max_length=100)
    weekly_activity: list[WeeklyActivityItem] = Field(max_length=7)

    @field_validator("reviewed_signs")
    @classmethod
    def valid_review_signs(cls, values: list[str]) -> list[str]:
        allowed = {"saya", "teman", "terima-kasih", "maaf", "siapa"}
        if len(set(values)) != len(values) or not set(values) <= allowed:
            raise ValueError("Invalid or duplicate review signs")
        return values


class ProgressWrite(ProgressUpdate):
    expected_revision: int = Field(ge=0)


class ProgressResponse(ProgressUpdate):
    revision: int
    updated_at: datetime
