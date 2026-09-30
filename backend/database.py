"""
Database configuration and async session maker for CHAPAA-GUARD.
Uses SQLAlchemy 2.0 async engine with PostgreSQL and asyncpg.
"""

import os
from pathlib import Path
from typing import AsyncGenerator

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool

# Postgres when DATABASE_URL is set. Otherwise a local SQLite file so the API
# can start without a database server.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./chapaa_guard.db",
)

# SQLAlchemy Base for declarative models
Base = declarative_base()

_engine_kwargs: dict = {
    "echo": os.getenv("SQL_ECHO", "False").lower() in ("true", "1"),
}
if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["poolclass"] = StaticPool
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20

# Global engine and sessionmaker
engine: AsyncEngine = create_async_engine(DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for injecting async database sessions into FastAPI routes."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
