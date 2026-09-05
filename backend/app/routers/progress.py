from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select, update

from app.dependencies import CsrfProtection, CurrentUser, DatabaseSession
from app.models import UserProgress
from app.schemas import ProgressResponse, ProgressWrite

router = APIRouter(prefix="/progress", tags=["progress"])


async def get_or_create_progress(
    database: DatabaseSession,
    current_user: CurrentUser,
) -> UserProgress:
    progress = await database.scalar(
        select(UserProgress).where(UserProgress.user_id == current_user.id)
    )
    if progress is not None:
        return progress

    progress = UserProgress(user_id=current_user.id)
    database.add(progress)
    await database.commit()
    await database.refresh(progress)
    return progress


@router.get("", response_model=ProgressResponse)
async def read_progress(
    request: Request,
    database: DatabaseSession,
    current_user: CurrentUser,
) -> UserProgress:
    if request.headers.get("X-Progress-Owner") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Account changed; sign in again")
    return await get_or_create_progress(database, current_user)


@router.put("", response_model=ProgressResponse)
async def replace_progress(
    payload: ProgressWrite,
    request: Request,
    database: DatabaseSession,
    current_user: CurrentUser,
    _csrf: CsrfProtection,
) -> UserProgress:
    if request.headers.get("X-Progress-Owner") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Account changed; sign in again")
    result = await database.execute(
        update(UserProgress)
        .where(UserProgress.user_id == current_user.id,
               UserProgress.revision == payload.expected_revision)
        .values(**payload.model_dump(exclude={"expected_revision"}),
                revision=UserProgress.revision + 1)
        .returning(UserProgress)
    )
    progress = result.scalar_one_or_none()
    if progress is None:
        raise HTTPException(status_code=409, detail="Progress changed on another device. Refresh before saving.")
    await database.commit()
    await database.refresh(progress)
    return progress
