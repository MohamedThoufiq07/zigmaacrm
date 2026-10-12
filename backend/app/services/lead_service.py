from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.lead_pipeline import Lead
from app.models.activity import Activity
from app.schemas.lead_schema import LeadCreate

class LeadService:
    @staticmethod
    async def create_lead(db: AsyncSession, org_id: str, lead_in: LeadCreate) -> Lead:
        # Deduplication check
        query = select(Lead).where(
            Lead.organization_id == org_id,
            or_(Lead.phone == lead_in.phone, Lead.email == lead_in.email)
        )
        existing = await db.execute(query)
        if existing.scalar_one_or_none():
            raise ValueError("Lead with this phone number or email already exists in organization.")

        lead = Lead(
            organization_id=org_id,
            full_name=lead_in.full_name,
            email=lead_in.email,
            phone=lead_in.phone,
            company_name=lead_in.company_name,
            source=lead_in.source or "META_ADS",
            status=lead_in.status or "NEW",
            custom_fields=lead_in.custom_fields or {},
            tags=lead_in.tags or [],
            notes=lead_in.notes
        )
        db.add(lead)
        await db.commit()
        await db.refresh(lead)

        # Activity log
        activity = Activity(
            organization_id=org_id,
            lead_id=lead.id,
            type="STAGE_CHANGE",
            notes=f"Lead created with source '{lead.source}'",
            status="COMPLETED"
        )
        db.add(activity)
        await db.commit()

        return lead
