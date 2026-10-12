from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.models.lead_pipeline import Pipeline, PipelineStage
from app.schemas.pipeline_schema import PipelineOut

router = APIRouter()

@router.get("/pipelines", response_model=List[PipelineOut])
async def get_pipelines(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pipeline).options(selectinload(Pipeline.stages)))
    return result.scalars().all()

@router.get("/pipelines/{pipeline_id}/board")
async def get_pipeline_board(pipeline_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pipeline)
        .options(selectinload(Pipeline.stages).selectinload(PipelineStage.deals))
        .where(Pipeline.id == pipeline_id)
    )
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    return pipeline
