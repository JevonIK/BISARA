from fastapi import APIRouter, HTTPException, Request, Response, status
from starlette.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.dependencies import CsrfProtection, CurrentUser, DatabaseSession
from app.models import User, UserProgress
from app.schemas import LoginRequest, RegisterRequest, UserResponse
from app.security import (
    DUMMY_PASSWORD_HASH,
    clear_auth_cookies,
    hash_password,
    set_auth_cookies,
    verify_password,
    new_auth_session,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    response: Response,
    database: DatabaseSession,
) -> User:
    normalized_email = payload.email.lower()
    existing_user = await database.scalar(
        select(User).where(User.email == normalized_email)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=normalized_email,
        display_name=payload.display_name.strip(),
        password_hash=await run_in_threadpool(hash_password, payload.password),
    )
    user.progress = UserProgress()
    database.add(user)
    try:
        await database.flush()
    except IntegrityError:
        await database.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists") from None
    session = new_auth_session(user.id)
    database.add(session)
    await database.commit()
    await database.refresh(user)
    set_auth_cookies(response, user.id, session)
    return user


@router.post("/login", response_model=UserResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    database: DatabaseSession,
) -> User:
    normalized_email = payload.email.lower()
    user = await database.scalar(
        select(User)
        .where(User.email == normalized_email)
    )

    encoded_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    password_is_valid = await run_in_threadpool(verify_password, payload.password, encoded_hash)
    if user is None or not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    session = new_auth_session(user.id)
    database.add(session)
    await database.commit()
    set_auth_cookies(response, user.id, session)
    return user


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: CurrentUser) -> User:
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    request: Request,
    database: DatabaseSession,
    _current_user: CurrentUser,
    _csrf: CsrfProtection,
) -> None:
    await database.delete(request.state.auth_session)
    await database.commit()
    clear_auth_cookies(response)
