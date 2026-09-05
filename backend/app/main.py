from contextlib import asynccontextmanager
from collections import OrderedDict
from time import monotonic

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionFactory, engine
from app.routers import auth, progress

@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

auth_requests: OrderedDict[str, list[float]] = OrderedDict()


@app.middleware("http")
async def browser_protection(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.headers.get("origin") not in settings.allowed_origins:
            return JSONResponse({"detail": "Untrusted request origin"}, status_code=403)
        if request.url.path.endswith(("/auth/login", "/auth/register")):
            # One-process baseline. Use an edge/distributed limiter for multiple workers.
            key = request.client.host if request.client else "unknown"
            now = monotonic()
            recent = [timestamp for timestamp in auth_requests.pop(key, []) if now - timestamp < 60]
            auth_requests[key] = recent
            if len(recent) >= 10:
                return JSONResponse({"detail": "Too many attempts. Try again in a minute."}, status_code=429, headers={"Retry-After": "60"})
            recent.append(now)
            while len(auth_requests) > 10000:
                auth_requests.popitem(last=False)
    response = await call_next(request)
    if request.url.path.startswith(settings.api_prefix):
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token", "X-Progress-Owner"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(progress.router, prefix=settings.api_prefix)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    async with AsyncSessionFactory() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ok"}
