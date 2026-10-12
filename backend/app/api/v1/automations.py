from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.activity import MessageLog

router = APIRouter()

@router.get("/automations/logs")
async def get_automation_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MessageLog).order_by(MessageLog.id.desc()))
    return result.scalars().all()
