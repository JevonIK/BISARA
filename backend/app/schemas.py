from datetime import date, datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


SIGN_IDS = {
    "air", "belajar", "cari", "hari", "ingat", "lagi", "maaf", "makan",
    "motor", "saya", "terima-kasih", "tuli", "apa", "siapa", "kapan",
    "di-mana", "mengapa", "bagaimana", "merah", "kuning", "hijau", "hitam",
    "dengar", "berangkat", "datang", "teman", "keluarga", "rumah", "pagi",
    "siang", "sore", "malam",
}
MISSION_IDS = {
    "berkenalan", "orang-terdekat", "tuli-dan-dengar", "bersikap-sopan",
    "checkpoint-kenalan", "bertanya-apa", "waktu-dan-tempat",
    "alasan-dan-cara", "cari-dan-pahami", "checkpoint-informasi",
    "makan-dan-minum", "belajar-di-rumah", "pergi-beraktivitas",
    "datang-hari-ini", "checkpoint-aktivitas", "pagi-dan-siang",
    "sore-dan-malam", "mengenal-warna", "mendeskripsikan-pilihan",
    "checkpoint-percakapan",
}


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


class RecallHistoryItem(ApiModel):
    independent_attempts: int = Field(ge=0, le=1_000_000)
    assisted_attempts: int = Field(ge=0, le=1_000_000)
    needs_practice_attempts: int = Field(ge=0, le=1_000_000)
    last_outcome: Literal["independent", "assisted", "needs-practice"]
    last_practiced_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    next_review_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    interval_days: int = Field(ge=1, le=30)


class SignMasteryItem(ApiModel):
    recall: RecallHistoryItem | None = None
    best_score: int = Field(ge=0, le=100)
    passed: bool
    attempts: int = Field(ge=0, le=1_000_000)
    last_practiced_at: str = Field(max_length=64)


class ProgressUpdate(ApiModel):
    xp: int = Field(ge=0, le=10_000_000)
    streak: int = Field(ge=0, le=100_000)
    last_active_date: date | None = None
    completed_missions: int = Field(ge=0, le=10_000)
    completed_mission_ids: list[str] = Field(max_length=20)
    mastered_signs: int = Field(ge=0, le=10_000)
    total_practice_minutes: int = Field(ge=0, le=10_000_000)
    best_chapter_score: int = Field(ge=0, le=100)
    best_gesture_score: int = Field(ge=0, le=100)
    last_chapter_score: int = Field(ge=0, le=100)
    chapter_one_stars: int = Field(ge=0, le=3)
    test_attempts: int = Field(ge=0, le=1_000_000)
    gesture_attempts: int = Field(ge=0, le=1_000_000)
    conversation_completions: int = Field(ge=0, le=1_000_000)
    mission_scores: dict[str, int] = Field(max_length=20)
    conversation_completions_by_mission: dict[str, int] = Field(max_length=20)
    sign_mastery: dict[str, SignMasteryItem] = Field(max_length=32)
    review_date: date | None = None
    reviewed_signs: list[str] = Field(max_length=100)
    weekly_activity: list[WeeklyActivityItem] = Field(max_length=7)

    @field_validator("reviewed_signs")
    @classmethod
    def valid_review_signs(cls, values: list[str]) -> list[str]:
        if len(set(values)) != len(values) or not set(values) <= SIGN_IDS:
            raise ValueError("Invalid or duplicate review signs")
        return values

    @field_validator("sign_mastery")
    @classmethod
    def valid_sign_mastery(
        cls, values: dict[str, SignMasteryItem]
    ) -> dict[str, SignMasteryItem]:
        if not set(values) <= SIGN_IDS:
            raise ValueError("Invalid sign mastery key")
        return values

    @field_validator("completed_mission_ids")
    @classmethod
    def valid_completed_missions(cls, values: list[str]) -> list[str]:
        if len(set(values)) != len(values) or not set(values) <= MISSION_IDS:
            raise ValueError("Invalid or duplicate completed missions")
        return values

    @field_validator("mission_scores")
    @classmethod
    def valid_mission_scores(cls, values: dict[str, int]) -> dict[str, int]:
        if not set(values) <= MISSION_IDS or any(score < 0 or score > 100 for score in values.values()):
            raise ValueError("Invalid mission score")
        return values

    @field_validator("conversation_completions_by_mission")
    @classmethod
    def valid_mission_completion_counts(cls, values: dict[str, int]) -> dict[str, int]:
        if not set(values) <= MISSION_IDS or any(count < 0 or count > 1_000_000 for count in values.values()):
            raise ValueError("Invalid mission completion count")
        return values


class ProgressWrite(ProgressUpdate):
    expected_revision: int = Field(ge=0)


class ProgressResponse(ProgressUpdate):
    revision: int
    updated_at: datetime
