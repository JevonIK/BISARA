# BISARA API

FastAPI, PostgreSQL 16, SQLAlchemy 2 async sessions, and Alembic migrations.
The frontend accesses `/api/v1` on its own origin. During development, Vite
proxies these requests to `127.0.0.1:8000`.

## Start the complete local application

From the repository root, with Docker Desktop running:

```bash
python3 backend/scripts/setup_local.py
docker compose up -d --build
pnpm dev
```

The setup script generates a random signing secret in `backend/.env` only
when the file is missing. It never prints the secret or overwrites existing
settings. `.env` is excluded from Git and the Docker image.

Open `http://localhost:3000/account`. The API documentation is available at
`http://localhost:8000/docs`; `http://localhost:8000/health` checks PostgreSQL.
Use `localhost`, not `127.0.0.1`, for the frontend because origins are explicit.
The frontend requires port 3000; it will not silently choose another port.

`docker compose stop` stops the local API and database without removing the
database volume. Start them again with `docker compose up -d`.

## Run the API without a container

You can run only PostgreSQL in Docker and run Python directly:

```bash
python3 backend/scripts/setup_local.py
docker compose up -d database
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Do not run this Python server and the API container on port 8000 simultaneously.

## API contract

| Method | Path                    | Purpose                                        |
| ------ | ----------------------- | ---------------------------------------------- |
| POST   | `/api/v1/auth/register` | Create an account and session                  |
| POST   | `/api/v1/auth/login`    | Issue a new session                            |
| GET    | `/api/v1/auth/me`       | Read the authenticated user                    |
| POST   | `/api/v1/auth/logout`   | Revoke the current session and clear cookies   |
| GET    | `/api/v1/progress`      | Read the user's progress and revision          |
| PUT    | `/api/v1/progress`      | Save progress if `expectedRevision` is current |

JSON uses camelCase. Registration accepts `email`, `displayName`, and
`password`; login accepts `email` and `password`. Progress dates use
`YYYY-MM-DD` or `null`, not empty strings. Both progress endpoints require
`X-Progress-Owner` to match the authenticated user ID, preventing an in-flight
request from crossing accounts when another tab changes the session.

All write requests require an allowed `Origin`. Authenticated writes also
require `X-CSRF-Token` to match both the CSRF cookie and the claim in the signed
session token. Authentication uses a host-only, HttpOnly, SameSite=Lax cookie.
JWTs require expiration, issuer, audience, and a database-backed session ID.
Logout revokes that session, so a copied token can no longer authenticate.
Passwords are hashed with Argon2 and never included in API responses.

The API rejects stale progress writes with 409. The frontend retains its local
version and asks the learner to choose a version. Both versions are backed up
locally before an explicit choice replaces either version. Offline changes are
cached per account and retried after reconnection; guest data is never uploaded
automatically. Guest import is offered only for a pristine account.

## Verification

With migrations applied and PostgreSQL running, from `backend`:

```bash
.venv/bin/python -m pytest tests -q
.venv/bin/alembic check
```

API tests use real PostgreSQL and an outer transaction that is rolled back at
the end of each test. They cover cookie flags, Argon2, origin/CSRF rejection,
account isolation, expired/revoked sessions, stale writes, and validation.

From the repository root:

```bash
pnpm test:sync
pnpm lint
pnpm build
```

The sync test uses a controlled HTTP boundary to check edits during a save,
account switching, conflicts, offline retries, and session expiry.

## Current scope

This milestone syncs learner-reported progress; the API validates structure and
ownership, but does not verify the truth of client-submitted XP or scores. It
must not be used as an authoritative leaderboard or certification result.
Server-side grading and recognition validation belong to the next phase.
Some curriculum/homepage progress remains prototype data. New accounts have
zero progress; importing guest data can also import the prototype's seed values.

Email verification, password reset, MFA, and a distributed rate limiter are not
included. The existing limiter allows ten registration/login requests per IP
per minute per API process. Production needs HTTPS, a new signing secret,
`COOKIE_SECURE=true`, explicit frontend origins, and a same-origin `/api/v1`
reverse proxy. The local Vite proxy does not exist in a production build.
This Compose file is for local development, with development database credentials.

## References

- [FastAPI security and Argon2](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [SQLAlchemy async sessions](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
