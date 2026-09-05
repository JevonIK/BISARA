"""Each test runs against real PostgreSQL inside a rolled-back outer transaction."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.database import get_database_session
from app.main import app, auth_requests


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        sessions = async_sessionmaker(connection, expire_on_commit=False, join_transaction_mode="create_savepoint")

        async def test_session():
            async with sessions() as session:
                yield session

        app.dependency_overrides[get_database_session] = test_session
        auth_requests.clear()
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver",
                                   headers={"Origin": "http://localhost:3000"}) as browser:
                yield browser
        finally:
            app.dependency_overrides.clear()
            await transaction.rollback()
    await engine.dispose()
