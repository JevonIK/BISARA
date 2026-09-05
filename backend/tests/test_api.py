from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest

from app.config import settings
from app.security import decode_access_token, hash_password, verify_password

pytestmark = pytest.mark.anyio
PREFIX = "/api/v1"
PASSWORD = "Only-for-automated-tests-421!"


async def register(client, name="Learner A"):
    email = f"learner-{uuid4().hex}@example.com"
    response = await client.post(f"{PREFIX}/auth/register", json={
        "email": email, "displayName": name, "password": PASSWORD,
    })
    assert response.status_code == 201, response.text
    data = response.json()
    assert "passwordHash" not in data and "password" not in data
    client.headers["X-Progress-Owner"] = data["id"]
    client.headers["X-CSRF-Token"] = client.cookies.get("bisara_csrf")
    return data, response


def writable(progress, **updates):
    return {**{k: v for k, v in progress.items() if k not in {"revision", "updatedAt"}},
            "expectedRevision": progress["revision"], **updates}


async def test_register_save_login_second_device_logout_revokes(client):
    user, response = await register(client)
    access_cookie = next(value for value in response.headers.get_list("set-cookie") if value.startswith("bisara_access="))
    assert "httponly" in access_cookie.lower() and "samesite=lax" in access_cookie.lower()
    assert response.headers["cache-control"] == "no-store"
    assert (await client.get(f"{PREFIX}/auth/me")).json()["id"] == user["id"]
    progress = (await client.get(f"{PREFIX}/progress")).json()
    assert progress["xp"] == 0 and progress["revision"] == 0
    saved = await client.put(f"{PREFIX}/progress", json=writable(progress, xp=80, bestChapterScore=100, chapterOneStars=3))
    assert saved.status_code == 200, saved.text
    assert saved.json()["revision"] == 1
    # A new session reads the same database record.
    client.cookies.clear()
    login = await client.post(f"{PREFIX}/auth/login", json={"email": user["email"].upper(), "password": PASSWORD})
    assert login.status_code == 200
    client.headers["X-CSRF-Token"] = client.cookies.get("bisara_csrf")
    assert (await client.get(f"{PREFIX}/progress")).json()["xp"] == 80
    copied_token = client.cookies.get("bisara_access")
    logout = await client.post(f"{PREFIX}/auth/logout")
    assert logout.status_code == 204 and logout.content == b""
    assert not client.cookies.get("bisara_access")
    client.cookies.set("bisara_access", copied_token)
    assert (await client.get(f"{PREFIX}/auth/me")).status_code == 401


async def test_accounts_are_isolated_and_stale_owner_is_rejected(client):
    user_a, _ = await register(client)
    token_a = client.cookies.get("bisara_access")
    progress = (await client.get(f"{PREFIX}/progress")).json()
    assert (await client.put(f"{PREFIX}/progress", json=writable(progress, xp=321))).status_code == 200
    client.cookies.clear()
    user_b, _ = await register(client, "Learner B")
    assert user_a["id"] != user_b["id"]
    assert (await client.get(f"{PREFIX}/progress")).json()["xp"] == 0
    client.headers["X-Progress-Owner"] = user_a["id"]
    assert (await client.get(f"{PREFIX}/progress")).status_code == 403
    assert (await client.put(f"{PREFIX}/progress", json=writable(progress, xp=999))).status_code == 403
    client.cookies.clear()
    client.cookies.set("bisara_access", token_a)
    assert (await client.get(f"{PREFIX}/progress")).json()["xp"] == 321


async def test_stale_revision_never_overwrites_newer_progress(client):
    await register(client)
    original = (await client.get(f"{PREFIX}/progress")).json()
    assert (await client.put(f"{PREFIX}/progress", json=writable(original, xp=123))).status_code == 200
    conflict = await client.put(f"{PREFIX}/progress", json=writable(original, xp=2))
    assert conflict.status_code == 409
    assert (await client.get(f"{PREFIX}/progress")).json()["xp"] == 123


async def test_csrf_is_bound_to_session_and_origin(client):
    await register(client)
    progress = (await client.get(f"{PREFIX}/progress")).json()
    client.headers.pop("X-CSRF-Token")
    assert (await client.put(f"{PREFIX}/progress", json=writable(progress))).status_code == 403
    csrf = client.cookies.get("bisara_csrf")
    client.cookies.delete("bisara_csrf")
    client.cookies.set("bisara_csrf", "forged")
    client.headers["X-CSRF-Token"] = "forged"
    assert (await client.put(f"{PREFIX}/progress", json=writable(progress))).status_code == 403
    client.cookies.delete("bisara_csrf")
    client.cookies.set("bisara_csrf", csrf)
    client.headers["X-CSRF-Token"] = csrf
    client.headers["Origin"] = "https://untrusted.example"
    assert (await client.put(f"{PREFIX}/progress", json=writable(progress))).status_code == 403
    assert (await client.post(f"{PREFIX}/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})).status_code == 403


async def test_invalid_and_expired_tokens_are_rejected(client):
    await register(client)
    token = client.cookies.get("bisara_access")
    claims = jwt.decode(token, settings.secret_key, algorithms=["HS256"], audience="bisara-web")
    claims["exp"] = datetime.now(timezone.utc) - timedelta(seconds=1)
    client.cookies.clear()
    client.cookies.set("bisara_access", jwt.encode(claims, settings.secret_key, algorithm="HS256"))
    assert (await client.get(f"{PREFIX}/auth/me")).status_code == 401
    del claims["exp"]
    assert decode_access_token(jwt.encode(claims, settings.secret_key, algorithm="HS256")) is None
    assert decode_access_token("invalid-token") is None


async def test_validation_duplicate_registration_and_wrong_password(client):
    user, _ = await register(client)
    duplicate = await client.post(f"{PREFIX}/auth/register", json={"email": user["email"], "displayName": "Duplicate", "password": PASSWORD})
    assert duplicate.status_code == 409
    for updates in ({"displayName": "  "}, {"password": "short"}, {"email": "not-an-email"}):
        response = await client.post(f"{PREFIX}/auth/register", json={"email": "valid@example.com", "displayName": "Valid", "password": PASSWORD, **updates})
        assert response.status_code == 422
    response = await client.post(f"{PREFIX}/auth/login", json={"email": user["email"], "password": "incorrect-password"})
    assert response.status_code == 401
    original = (await client.get(f"{PREFIX}/progress")).json()
    for fields in ({"xp": -1}, {"chapterOneStars": 4}, {"reviewedSigns": ["saya", "saya"]}):
        assert (await client.put(f"{PREFIX}/progress", json=writable(original, **fields))).status_code == 422


async def test_secure_cookie_configuration_and_throttle(client, monkeypatch):
    monkeypatch.setattr(settings, "cookie_secure", True)
    _, response = await register(client)
    assert all("Secure" in cookie for cookie in response.headers.get_list("set-cookie"))
    for _ in range(9):
        await client.post(f"{PREFIX}/auth/login", json={"email": "missing@example.com", "password": PASSWORD})
    assert (await client.post(f"{PREFIX}/auth/login", json={"email": "missing@example.com", "password": PASSWORD})).status_code == 429


def test_password_hash_and_secret_validation():
    from app.config import Settings
    from pydantic import ValidationError
    encoded = hash_password(PASSWORD)
    assert encoded.startswith("$argon2id$") and encoded != PASSWORD
    assert verify_password(PASSWORD, encoded)
    assert not verify_password("incorrect", encoded)
    with pytest.raises(ValidationError):
        Settings(secret_key="too-short")
