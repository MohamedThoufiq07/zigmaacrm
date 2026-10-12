from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models.deal import Deal
from app.models.lead_pipeline import PipelineStage
from app.models.organization_user import Organization
from app.models.activity import Activity
from app.schemas.deal_schema import DealCreate, DealOut, DealStageMove

router = APIRouter()

@router.get("/deals", response_model=List[DealOut])
async def get_deals(
    pipeline_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Deal).order_by(Deal.id.desc())
    if pipeline_id:
        query = query.where(Deal.pipeline_id == pipeline_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/deals", response_model=DealOut)
async def create_deal(
    deal_in: DealCreate,
    org_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    if not org_id:
        res = await db.execute(select(Organization))
        org = res.scalars().first()
        org_id = org.id if org else "default_org"

    deal = Deal(
        organization_id=org_id,
        pipeline_id=deal_in.pipeline_id,
        stage_id=deal_in.stage_id,
        lead_id=deal_in.lead_id,
        title=deal_in.title,
        deal_value=deal_in.deal_value,
        currency=deal_in.currency,
        expected_close_date=deal_in.expected_close_date,
        status=deal_in.status or "OPEN"
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    return deal

@router.patch("/deals/{deal_id}/move-stage", response_model=DealOut)
async def move_deal_stage(
    deal_id: str,
    move_in: DealStageMove,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    old_stage_id = deal.stage_id
    deal.stage_id = move_in.stage_id

    # Fetch stage title for log
    stage_res = await db.execute(select(PipelineStage).where(PipelineStage.id == move_in.stage_id))
    stage = stage_res.scalar_one_or_none()
    stage_title = stage.title if stage else move_in.stage_id

    # Log activity
    act = Activity(
        organization_id=deal.organization_id,
        deal_id=deal.id,
        lead_id=deal.lead_id,
        type="STAGE_CHANGE",
        notes=f"Deal stage moved to '{stage_title}'",
        status="COMPLETED"
    )
    db.add(act)
    await db.commit()
    await db.refresh(deal)
    return deal
