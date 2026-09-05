from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from uuid import UUID

import jwt
from fastapi import Response
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from app.config import settings
from app.models import AuthSession

ALGORITHM = "HS256"
password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("bisara-dummy-password")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded_hash: str) -> bool:
    return password_hash.verify(password, encoded_hash)


def create_access_token(user_id: UUID, session: AuthSession, csrf_token: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": f"user:{user_id}", "exp": session.expires_at, "iat": now,
         "jti": str(session.id), "csrf": csrf_token, "iss": "bisara-api", "aud": "bisara-web"},
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM],
                             issuer="bisara-api", audience="bisara-web",
                             options={"require": ["sub", "exp", "iat", "jti", "csrf"]})
        subject = payload.get("sub", "")
        prefix, user_id = subject.split(":", maxsplit=1)
        if prefix != "user" or not isinstance(payload["csrf"], str):
            return None
        UUID(user_id)
        UUID(payload["jti"])
        return payload
    except (InvalidTokenError, ValueError, TypeError, AttributeError):
        return None


def set_auth_cookies(response: Response, user_id: UUID, session: AuthSession) -> None:
    max_age = settings.access_token_expire_minutes * 60
    csrf_token = token_urlsafe(32)
    cookie_options = {
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "path": "/",
        "max_age": max_age,
    }

    response.set_cookie(
        key=settings.access_cookie_name,
        value=create_access_token(user_id, session, csrf_token),
        httponly=True,
        **cookie_options,
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        **cookie_options,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(settings.access_cookie_name, path="/", secure=settings.cookie_secure, httponly=True, samesite="lax")
    response.delete_cookie(settings.csrf_cookie_name, path="/", secure=settings.cookie_secure, samesite="lax")


def new_auth_session(user_id: UUID) -> AuthSession:
    return AuthSession(user_id=user_id, expires_at=datetime.now(timezone.utc) +
                       timedelta(minutes=settings.access_token_expire_minutes))
