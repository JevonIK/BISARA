from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BISARA API"
    api_prefix: str = "/api/v1"
    database_url: str
    secret_key: str = Field(min_length=32)
    frontend_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    access_token_expire_minutes: int = Field(default=1440, ge=1, le=10080)
    access_cookie_name: str = "bisara_access"
    csrf_cookie_name: str = "bisara_csrf"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("secret_key")
    @classmethod
    def reject_placeholder_secret(cls, value: str) -> str:
        if "replace-with" in value or "change-before" in value:
            raise ValueError("Generate SECRET_KEY with secrets.token_urlsafe(48)")
        return value

    @field_validator("frontend_origins")
    @classmethod
    def validate_origins(cls, value: str) -> str:
        from urllib.parse import urlsplit
        for origin in value.split(","):
            parsed = urlsplit(origin.strip())
            if (parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path
                or parsed.username or parsed.password or parsed.query or parsed.fragment or "*" in origin):
                raise ValueError("Use explicit origins without paths or wildcards")
        return value

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
