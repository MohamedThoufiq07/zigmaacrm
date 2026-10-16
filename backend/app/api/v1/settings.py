from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models.organization_user import Organization, User
from app.models.organization_setting import OrganizationSetting
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

class OrganizationSettingSchema(BaseModel):
    company_name: Optional[str] = "Arsath Thoufiq's Workspace"
    logo_url: Optional[str] = None
    email: Optional[str] = "thoufiqarsath84@gmail.com"
    phone: Optional[str] = "+91 98765 43210"
    address: Optional[str] = "Chennai Tech Park, Guindy, Chennai, Tamil Nadu 600032"
    gstin: Optional[str] = "33AAECZ9920K1ZX"
    website: Optional[str] = "https://zigmaa.com"
    signatory_name: Optional[str] = "Arsath Thoufiq"
    signatory_designation: Optional[str] = "Authorized Signatory"
    bank_name: Optional[str] = "HDFC Bank Ltd"
    account_number: Optional[str] = "50200084729104"
    ifsc_code: Optional[str] = "HDFC0001244"
    upi_id: Optional[str] = "zigmaa@hdfcbank"
    default_terms: Optional[str] = "Payment terms: 50% advance, balance upon project milestone delivery. Bank Transfer / UPI accepted."

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

# ==============================================================================
# Dynamic Organization Branding & Signatory Endpoints
# ==============================================================================

@router.get("/organization")
@router.get("/organization-settings")
async def get_organization_settings(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(OrganizationSetting).order_by(OrganizationSetting.created_at.desc()))
    setting = res.scalars().first()
    if not setting:
        # Also check Organization model to get name if exists
        org_res = await db.execute(select(Organization))
        org = org_res.scalars().first()
        org_name = org.name if org and org.name else "Arsath Thoufiq's Workspace"
        return {
            "company_name": org_name,
            "logo_url": None,
            "email": "thoufiqarsath84@gmail.com",
            "phone": "+91 98765 43210",
            "address": "Chennai Tech Park, Guindy, Chennai, Tamil Nadu 600032",
            "gstin": "33AAECZ9920K1ZX",
            "website": "https://zigmaa.com",
            "signatory_name": "Arsath Thoufiq",
            "signatory_designation": "Authorized Signatory",
            "bank_name": "HDFC Bank Ltd",
            "account_number": "50200084729104",
            "ifsc_code": "HDFC0001244",
            "upi_id": "zigmaa@hdfcbank",
            "default_terms": "Payment terms: 50% advance, balance upon project milestone delivery. Bank Transfer / UPI accepted."
        }

    return {
        "id": setting.id,
        "organization_id": setting.organization_id,
        "company_name": setting.company_name or "Arsath Thoufiq's Workspace",
        "logo_url": setting.logo_url,
        "email": setting.email or "thoufiqarsath84@gmail.com",
        "phone": setting.phone or "+91 98765 43210",
        "address": setting.address or "Chennai Tech Park, Guindy, Chennai, Tamil Nadu 600032",
        "gstin": setting.gstin or "33AAECZ9920K1ZX",
        "website": setting.website or "https://zigmaa.com",
        "signatory_name": setting.signatory_name or "Arsath Thoufiq",
        "signatory_designation": setting.signatory_designation or "Authorized Signatory",
        "bank_name": setting.bank_name or "HDFC Bank Ltd",
        "account_number": setting.account_number or "50200084729104",
        "ifsc_code": setting.ifsc_code or "HDFC0001244",
        "upi_id": setting.upi_id or "zigmaa@hdfcbank",
        "default_terms": setting.default_terms or "Payment terms: 50% advance, balance upon project milestone delivery. Bank Transfer / UPI accepted."
    }

@router.post("/organization")
@router.put("/organization")
async def save_organization_settings(
    payload: OrganizationSettingSchema,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(OrganizationSetting).order_by(OrganizationSetting.created_at.desc()))
    setting = res.scalars().first()

    org_res = await db.execute(select(Organization))
    org = org_res.scalars().first()
    org_id = org.id if org else None

    # Sync company_name with Organization table if present
    if org and payload.company_name:
        org.name = payload.company_name.strip()

    if not setting:
        setting = OrganizationSetting(
            organization_id=org_id,
            company_name=payload.company_name,
            logo_url=payload.logo_url,
            email=payload.email,
            phone=payload.phone,
            address=payload.address,
            gstin=payload.gstin,
            website=payload.website,
            signatory_name=payload.signatory_name,
            signatory_designation=payload.signatory_designation,
            bank_name=payload.bank_name,
            account_number=payload.account_number,
            ifsc_code=payload.ifsc_code,
            upi_id=payload.upi_id,
            default_terms=payload.default_terms
        )
        db.add(setting)
    else:
        if payload.company_name is not None:
            setting.company_name = payload.company_name
        if payload.logo_url is not None:
            setting.logo_url = payload.logo_url
        if payload.email is not None:
            setting.email = payload.email
        if payload.phone is not None:
            setting.phone = payload.phone
        if payload.address is not None:
            setting.address = payload.address
        if payload.gstin is not None:
            setting.gstin = payload.gstin
        if payload.website is not None:
            setting.website = payload.website
        if payload.signatory_name is not None:
            setting.signatory_name = payload.signatory_name
        if payload.signatory_designation is not None:
            setting.signatory_designation = payload.signatory_designation
        if payload.bank_name is not None:
            setting.bank_name = payload.bank_name
        if payload.account_number is not None:
            setting.account_number = payload.account_number
        if payload.ifsc_code is not None:
            setting.ifsc_code = payload.ifsc_code
        if payload.upi_id is not None:
            setting.upi_id = payload.upi_id
        if payload.default_terms is not None:
            setting.default_terms = payload.default_terms

    await db.commit()
    await db.refresh(setting)

    return {
        "status": "success",
        "message": "Organization settings saved successfully",
        "settings": {
            "id": setting.id,
            "company_name": setting.company_name,
            "logo_url": setting.logo_url,
            "email": setting.email,
            "phone": setting.phone,
            "address": setting.address,
            "gstin": setting.gstin,
            "website": setting.website,
            "signatory_name": setting.signatory_name,
            "signatory_designation": setting.signatory_designation,
            "bank_name": setting.bank_name,
            "account_number": setting.account_number,
            "ifsc_code": setting.ifsc_code,
            "upi_id": setting.upi_id,
            "default_terms": setting.default_terms
        }
    }
