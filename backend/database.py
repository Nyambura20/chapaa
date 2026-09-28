"""
Database configuration and async session maker for CHAPAA-GUARD.
Uses SQLAlchemy 2.0 async engine with PostgreSQL and asyncpg.
"""

import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine,
)
from sqlalchemy.orm import declarative_base

# Default to local postgresql+asyncpg or sqlite+aiosqlite fallback for testing
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/chapaa_guard",
)

# SQLAlchemy Base for declarative models
Base = declarative_base()

# Global engine and sessionmaker
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "False").lower() in ("true", "1"),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

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
