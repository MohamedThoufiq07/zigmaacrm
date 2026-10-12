import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger("zigmaa.database")

# DB Configuration: Preferences settings.DATABASE_URL or environment variable
db_url = os.getenv(
    "DATABASE_URL",
    settings.DATABASE_URL or "postgresql+asyncpg://postgres:thoufiq@localhost:5432/zigmaa_crm"
)

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_async_engine(db_url, connect_args=connect_args, echo=False)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
