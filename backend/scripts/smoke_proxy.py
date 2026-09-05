"""Exercise the running frontend proxy and API, removing only the temporary account created here."""
import asyncio
import sys
from pathlib import Path
from secrets import token_urlsafe
from uuid import UUID, uuid4

import httpx
from sqlalchemy import delete

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.database import AsyncSessionFactory, engine
from app.models import User


async def main():
    user_id = None
    email = f"smoke-{uuid4().hex}@example.com"
    password = token_urlsafe(24)
    try:
        async with httpx.AsyncClient(base_url="http://localhost:3000", timeout=30,
                                     headers={"Origin": "http://localhost:3000"}) as client:
            assert (await client.get("/account")).status_code == 200
            assert (await client.get("/api/v1/auth/me")).status_code == 401
            registration = await client.post("/api/v1/auth/register", json={
                "email": email, "displayName": "Temporary smoke test", "password": password,
            })
            registration.raise_for_status()
            user_id = UUID(registration.json()["id"])
            client.headers["X-Progress-Owner"] = str(user_id)
            client.headers["X-CSRF-Token"] = client.cookies.get("bisara_csrf")
            old = (await client.get("/api/v1/progress")).json()
            update = {key: value for key, value in old.items() if key not in {"revision", "updatedAt"}}
            update.update(xp=75, expectedRevision=old["revision"])
            assert (await client.put("/api/v1/progress", json=update)).status_code == 200
            assert (await client.post("/api/v1/auth/logout")).status_code == 204
            assert (await client.get("/api/v1/auth/me")).status_code == 401
            assert (await client.post("/api/v1/auth/login", json={"email": email, "password": password})).status_code == 200
            assert (await client.get("/api/v1/progress")).json()["xp"] == 75
            print("PASS: /account, proxy, cookies, registration, save, logout, login, persisted progress")
    finally:
        if user_id:
            async with AsyncSessionFactory() as database:
                await database.execute(delete(User).where(User.id == user_id, User.email == email))
                await database.commit()
            print("Removed only the temporary smoke-test account and its test data.")
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
