from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.models.contact import Contact
from app.models.organization_user import Organization
from app.services.webhook_service import WebhookService
from app.api.v1.webhooks.whatsapp import router as whatsapp_webhook_router

router = APIRouter()

# Include whatsapp webhook sub-router
router.include_router(whatsapp_webhook_router, tags=["WhatsApp Webhook"])

class InboundLeadPayload(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    company_name: Optional[str] = None
    source: Optional[str] = "META_ADS"
    custom_data: Optional[Dict[str, Any]] = {}
    organization_id: Optional[str] = None

@router.post("/inbound-lead", status_code=status.HTTP_201_CREATED)
@router.post("/webhooks/inbound-lead", status_code=status.HTTP_201_CREATED)
async def inbound_lead_webhook(payload: InboundLeadPayload, db: AsyncSession = Depends(get_db)):
    """
    Inbound Lead Webhook Endpoint
    Inserts lead directly into contacts table with lifecycle_stage='NEW' and commits to PostgreSQL.
    If phone already exists, safely deduplicates and logs inbound enquiry activity without throwing a 500 error.
    """
    from app.models.activity import Activity

    target_org_id = payload.organization_id
    if not target_org_id:
        res = await db.execute(select(Organization))
        org = res.scalars().first()
        target_org_id = org.id if org else None

    # Check for duplicate lead by phone
    clean_phone = payload.phone.strip()
    existing_res = await db.execute(select(Contact).where(Contact.phone == clean_phone))
    existing_contact = existing_res.scalar_one_or_none()

    if existing_contact:
        # Append inbound lead activity to history
        activity = Activity(
            organization_id=existing_contact.organization_id or target_org_id,
            contact_id=existing_contact.id,
            lead_id=None,
            type="NOTE",
            notes=f"Re-enquired via {payload.source or 'Inbound Webhook'}. Campaign: {payload.custom_data.get('ad_campaign', 'N/A') if payload.custom_data else 'Direct'}",
            status="COMPLETED"
        )
        db.add(activity)
        # Update custom_data
        curr_data = dict(existing_contact.custom_data or {})
        if payload.custom_data:
            curr_data.update(payload.custom_data)
            existing_contact.custom_data = curr_data
        await db.commit()
        await db.refresh(existing_contact)
        return {
            "status": "success",
            "deduplicated": True,
            "contact_id": str(existing_contact.id),
            "message": "Existing contact updated with new inbound enquiry"
        }

    contact = Contact(
        organization_id=target_org_id,
        full_name=payload.full_name,
        phone=clean_phone,
        email=payload.email,
        company_name=payload.company_name,
        source=payload.source or "META_ADS",
        status="NEW",
        lifecycle_stage="NEW",
        custom_data=payload.custom_data or {},
        assigned_user_name="Mohamed Thoufiq"
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    return {
        "status": "success",
        "deduplicated": False,
        "contact_id": str(contact.id)
    }

@router.post("/meta")
@router.post("/webhooks/meta")
async def meta_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.json()
    lead = await WebhookService.process_meta_lead(db, payload)
    return {"status": "success", "lead_id": lead.id}

@router.post("/generic")
@router.post("/webhooks/generic")
async def generic_webhook(payload: dict, db: AsyncSession = Depends(get_db)):
    lead = await WebhookService.process_meta_lead(db, payload)
    return {"status": "success", "lead_id": lead.id}
