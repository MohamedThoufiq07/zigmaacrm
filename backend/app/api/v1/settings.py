from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models.organization_user import Organization, User
from app.models.base import TimeStampedBase, generate_uuid
from sqlalchemy import Column, String, Boolean, JSON

# Model for persistent email sync settings
class EmailSyncSetting(TimeStampedBase):
    __tablename__ = "email_sync_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), nullable=True, index=True)
    is_connected = Column(Boolean, default=False)
    email = Column(String(255), nullable=True)
    provider = Column(String(50), default="GMAIL")  # GMAIL, OUTLOOK, IMAP
    last_synced_at = Column(String(50), nullable=True)
    sync_metadata = Column(JSON, default=dict)

router = APIRouter()

class ConnectEmailRequest(BaseModel):
    email: str
    provider: Optional[str] = "GMAIL"

@router.get("/email-sync")
async def get_email_sync(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(EmailSyncSetting).order_by(EmailSyncSetting.created_at.desc()))
    setting = res.scalars().first()
    if not setting:
        return {
            "is_connected": False,
            "email": None,
            "provider": None,
            "last_synced_at": None
        }
    return {
        "is_connected": setting.is_connected,
        "email": setting.email,
        "provider": setting.provider,
        "last_synced_at": setting.last_synced_at or "Just now"
    }

@router.post("/email-sync/connect")
async def connect_email_sync(
    req: ConnectEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(EmailSyncSetting).order_by(EmailSyncSetting.created_at.desc()))
    setting = res.scalars().first()
    
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    if not setting:
        setting = EmailSyncSetting(
            is_connected=True,
            email=req.email,
            provider=req.provider or "GMAIL",
            last_synced_at=now_str
        )
        db.add(setting)
    else:
        setting.is_connected = True
        setting.email = req.email
        setting.provider = req.provider or "GMAIL"
        setting.last_synced_at = now_str

    await db.commit()
    await db.refresh(setting)

    return {
        "status": "success",
        "message": f"Successfully connected {setting.email}",
        "is_connected": True,
        "email": setting.email,
        "provider": setting.provider,
        "last_synced_at": setting.last_synced_at
    }

@router.post("/email-sync/disconnect")
async def disconnect_email_sync(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(EmailSyncSetting).order_by(EmailSyncSetting.created_at.desc()))
    setting = res.scalars().first()
    if setting:
        setting.is_connected = False
        setting.last_synced_at = None
        await db.commit()
    
    return {
        "status": "success",
        "message": "Email sync disconnected",
        "is_connected": False,
        "email": None,
        "provider": None
    }
