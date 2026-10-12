from sqlalchemy.ext.asyncio import AsyncSession
from app.models.lead_pipeline import Lead
from app.models.activity import MessageLog

class WebhookService:
    @staticmethod
    async def process_meta_lead(db: AsyncSession, payload: dict):
        """
        Parses Meta/Facebook Lead Ads webhook format
        """
        org_id = payload.get("organization_id", "default_org")
        lead_data = payload.get("lead_gen_data", {})
        
        full_name = lead_data.get("full_name", "Meta Ad Lead")
        phone = lead_data.get("phone", "+91 99999 88888")
        email = lead_data.get("email", "lead@meta.com")
        
        lead = Lead(
            organization_id=org_id,
            full_name=full_name,
            phone=phone,
            email=email,
            source="META_ADS",
            status="NEW"
        )
        db.add(lead)
        await db.commit()
        await db.refresh(lead)
        return lead
