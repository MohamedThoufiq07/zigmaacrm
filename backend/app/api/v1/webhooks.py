from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.webhook_service import WebhookService

router = APIRouter()

@router.post("/webhooks/meta")
async def meta_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.json()
    lead = await WebhookService.process_meta_lead(db, payload)
    return {"status": "success", "lead_id": lead.id}

@router.post("/webhooks/generic")
async def generic_webhook(payload: dict, db: AsyncSession = Depends(get_db)):
    lead = await WebhookService.process_meta_lead(db, payload)
    return {"status": "success", "lead_id": lead.id}
