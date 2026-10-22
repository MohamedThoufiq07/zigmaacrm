from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional, Any, Dict
from pydantic import BaseModel

from app.core.database import get_db
from app.models.deal import Deal
from app.models.lead_pipeline import Pipeline, PipelineStage, Lead
from app.models.contact import Contact
from app.models.organization_user import Organization, User
from app.api.deps import get_current_user
from app.models.activity import Activity
from app.schemas.deal_schema import DealCreate, DealOut, DealStageMove

router = APIRouter()

class DealStageUpdate(BaseModel):
    stage_id: Optional[str] = None
    stage: Optional[str] = None

@router.get("/deals", response_model=List[DealOut])
async def get_deals(
    pipeline_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Deal).order_by(Deal.id.desc())
    if pipeline_id:
        query = query.where(Deal.pipeline_id == pipeline_id)
    if current_user.role == "SALES_REP":
        query = query.where(
            or_(
                Deal.owner_id == current_user.id,
                Deal.assigned_user_id == current_user.id,
                Deal.owner_name.ilike(f"%{current_user.full_name}%")
            )
        )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/deals/board")
async def get_deals_board(
    pipeline_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve pipeline
    if pipeline_id:
        p_res = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id))
        pipeline = p_res.scalar_one_or_none()
    else:
        p_res = await db.execute(select(Pipeline).order_by(Pipeline.is_default.desc(), Pipeline.created_at.asc()))
        pipeline = p_res.scalars().first()

    if not pipeline:
        return {"pipeline": None, "stages": []}

    stages_res = await db.execute(
        select(PipelineStage)
        .where(PipelineStage.pipeline_id == pipeline.id)
        .order_by(PipelineStage.stage_order.asc())
    )
    stages = stages_res.scalars().all()

    # Retrieve deals for this pipeline
    deals_query = select(Deal).where(Deal.pipeline_id == pipeline.id)
    if current_user.role == "SALES_REP":
        deals_query = deals_query.where(
            or_(
                Deal.owner_id == current_user.id,
                Deal.assigned_user_id == current_user.id,
                Deal.owner_name.ilike(f"%{current_user.full_name}%")
            )
        )
    deals_res = await db.execute(deals_query.order_by(Deal.updated_at.desc()))
    deals = deals_res.scalars().all()

    # Also map lead / contact company and names if needed
    board_stages = []
    for st in stages:
        stage_deals = []
        total_value = 0.0
        for d in deals:
            # match by stage_id or case-insensitive title match
            if d.stage_id == st.id or d.stage_id == st.title:
                total_value += float(d.deal_value or 0.0)
                company = (d.custom_data or {}).get("company_name", "")
                contact_name = (d.custom_data or {}).get("contact_name", "")
                stage_deals.append({
                    "id": d.id,
                    "title": d.title,
                    "deal_value": d.deal_value,
                    "currency": d.currency,
                    "stage_id": d.stage_id,
                    "stage": st.title,
                    "probability": st.probability,
                    "expected_close_date": d.expected_close_date,
                    "company_name": company,
                    "contact_name": contact_name,
                    "assigned_user_id": d.assigned_user_id,
                    "status": d.status,
                    "custom_data": d.custom_data or {},
                    "custom_properties": d.custom_properties or d.custom_data or {},
                    "created_at": d.created_at.isoformat() if d.created_at else None
                })
        board_stages.append({
            "id": st.id,
            "title": st.title,
            "stage_order": st.stage_order,
            "probability": st.probability,
            "color_code": st.color_code,
            "count": len(stage_deals),
            "total_value": total_value,
            "deals": stage_deals
        })

    return {
        "pipeline": {
            "id": pipeline.id,
            "name": pipeline.name
        },
        "stages": board_stages
    }

@router.post("/deals", response_model=DealOut)
async def create_deal(
    deal_in: DealCreate,
    org_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not org_id:
        res = await db.execute(select(Organization))
        org = res.scalars().first()
        org_id = org.id if org else "default_org"

    # Resolve pipeline & stage if not provided or provided as names
    pipeline_id = deal_in.pipeline_id
    if not pipeline_id:
        p_res = await db.execute(select(Pipeline).order_by(Pipeline.is_default.desc(), Pipeline.created_at.asc()))
        first_p = p_res.scalars().first()
        pipeline_id = first_p.id if first_p else "default_pipeline"

    stage_id = deal_in.stage_id
    if not stage_id or not len(stage_id) > 20: # If name was provided e.g. "Discovery"
        # Find stage by title or get first stage
        st_res = await db.execute(
            select(PipelineStage).where(
                PipelineStage.pipeline_id == pipeline_id,
                PipelineStage.title.ilike(f"%{deal_in.stage_id or 'New'}%")
            )
        )
        found_st = st_res.scalars().first()
        if not found_st:
            st_first = await db.execute(
                select(PipelineStage).where(PipelineStage.pipeline_id == pipeline_id).order_by(PipelineStage.stage_order.asc())
            )
            found_st = st_first.scalars().first()
        stage_id = found_st.id if found_st else deal_in.stage_id or "default_stage"

    owner_id = deal_in.owner_id or (current_user.id if current_user else None)
    owner_name = deal_in.owner_name or deal_in.assigned_user_name or (current_user.full_name if current_user else "Mohamed Thoufiq")
    assigned_user_id = deal_in.assigned_user_id or owner_id
    custom_props = deal_in.custom_properties or deal_in.custom_data or {}

    deal = Deal(
        organization_id=org_id,
        pipeline_id=pipeline_id,
        stage_id=stage_id,
        lead_id=deal_in.lead_id,
        contact_id=deal_in.contact_id,
        title=deal_in.title,
        deal_value=deal_in.deal_value,
        currency=deal_in.currency,
        expected_close_date=deal_in.expected_close_date,
        status=deal_in.status or "OPEN",
        custom_data=custom_props,
        custom_properties=custom_props,
        assigned_user_id=assigned_user_id,
        owner_id=owner_id,
        owner_name=owner_name
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    return deal

@router.patch("/deals/{deal_id}")
async def update_deal(
    deal_id: str,
    deal_in: dict,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if "custom_properties" in deal_in:
        deal.custom_properties = deal_in["custom_properties"]
        deal.custom_data = deal_in["custom_properties"]
    elif "custom_data" in deal_in:
        deal.custom_data = deal_in["custom_data"]
        deal.custom_properties = deal_in["custom_data"]

    for key, val in deal_in.items():
        if key not in ["id", "created_at", "custom_properties", "custom_data"] and hasattr(deal, key):
            setattr(deal, key, val)

    await db.commit()
    await db.refresh(deal)
    return deal

@router.patch("/deals/{deal_id}/stage")
@router.patch("/deals/{deal_id}/move-stage")
async def update_deal_stage(
    deal_id: str,
    move_in: DealStageUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    target_stage = move_in.stage_id or move_in.stage
    if not target_stage:
        raise HTTPException(status_code=400, detail="stage_id or stage is required")

    # Try resolving stage by ID or Title
    stage_res = await db.execute(
        select(PipelineStage).where(
            (PipelineStage.id == target_stage) | (PipelineStage.title.ilike(target_stage))
        )
    )
    stage = stage_res.scalars().first()
    if stage:
        deal.stage_id = stage.id
        stage_title = stage.title
    else:
        deal.stage_id = target_stage
        stage_title = target_stage

    # Update deal status if moved to won or lost
    if "won" in stage_title.lower():
        deal.status = "WON"
    elif "lost" in stage_title.lower():
        deal.status = "LOST"
    else:
        deal.status = "OPEN"

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
    return {
        "success": True,
        "deal_id": deal.id,
        "stage_id": deal.stage_id,
        "stage": stage_title,
        "status": deal.status
    }

@router.delete("/deals/{deal_id}")
async def delete_deal(
    deal_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    await db.delete(deal)
    await db.commit()
    return {"message": "Deal deleted successfully"}
