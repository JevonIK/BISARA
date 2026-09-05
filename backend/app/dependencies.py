from hmac import compare_digest
from typing import Annotated
from datetime import datetime, timezone
from uuid import UUID

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_database_session
from app.models import AuthSession, User
from app.security import decode_access_token

DatabaseSession = Annotated[AsyncSession, Depends(get_database_session)]


async def get_current_user(
    database: DatabaseSession,
    request: Request,
    access_token: Annotated[
        str | None,
        Cookie(alias=settings.access_cookie_name),
    ] = None,
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
    if not access_token:
        raise unauthorized

    payload = decode_access_token(access_token)
    if payload is None:
        raise unauthorized

    user_id = UUID(payload["sub"].split(":", 1)[1])
    session = await database.get(AuthSession, UUID(payload["jti"]))
    if session is None or session.user_id != user_id or session.expires_at <= datetime.now(timezone.utc):
        raise unauthorized
    request.state.auth_session = session
    request.state.auth_csrf = payload["csrf"]

    user = await database.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


async def verify_csrf_token(
    request: Request,
    _user: Annotated[User, Depends(get_current_user)],
    csrf_cookie: Annotated[
        str | None,
        Cookie(alias=settings.csrf_cookie_name),
    ] = None,
    csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> None:
    if (
        not csrf_cookie
        or not csrf_header
        or not csrf_cookie.isascii()
        or not csrf_header.isascii()
        or not compare_digest(csrf_cookie, csrf_header)
        or not compare_digest(csrf_header, request.state.auth_csrf)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )


CurrentUser = Annotated[User, Depends(get_current_user)]
CsrfProtection = Annotated[None, Depends(verify_csrf_token)]
