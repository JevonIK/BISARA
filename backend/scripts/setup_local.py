"""Create local secrets once without printing them or overwriting an existing .env."""
from pathlib import Path
from secrets import token_urlsafe

destination = Path(__file__).resolve().parents[1] / ".env"
if destination.exists():
    print("backend/.env already exists; left unchanged.")
else:
    with destination.open("x", encoding="utf-8") as output:
        output.write(
            "DATABASE_URL=postgresql+asyncpg://bisara:bisara_dev@localhost:5432/bisara\n"
            f"SECRET_KEY={token_urlsafe(48)}\n"
            "FRONTEND_ORIGINS=http://localhost:3000\n"
            "COOKIE_SECURE=false\n"
            "ACCESS_TOKEN_EXPIRE_MINUTES=1440\n"
        )
    destination.chmod(0o600)
    print("Created backend/.env with a random secret (gitignored).")
