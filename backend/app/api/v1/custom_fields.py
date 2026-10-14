from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.custom_field import CustomField
from app.models.organization_user import Organization

router = APIRouter()

class CustomFieldCreate(BaseModel):
    entity_type: str  # LEAD, CONTACT, DEAL
    label: str
    field_key: str
    field_type: str  # TEXT, NUMBER, SELECT, DATE, BOOLEAN
    options: Optional[List[str]] = []
    is_required: Optional[bool] = False

class CustomFieldOut(BaseModel):
    id: str
    organization_id: str
    entity_type: str
    label: str
    field_key: str
    field_type: str
    options: Optional[Any] = []
    is_required: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/custom-fields", response_model=List[CustomFieldOut])
async def get_custom_fields(
    entity_type: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(CustomField).order_by(CustomField.created_at.asc())
    if entity_type:
        query = query.where(CustomField.entity_type == entity_type.upper())
    if org_id:
        query = query.where(CustomField.organization_id == org_id)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/custom-fields", response_model=CustomFieldOut)
async def create_custom_field(
    field_in: CustomFieldCreate,
    org_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    if not org_id:
        res = await db.execute(select(Organization))
        org = res.scalars().first()
        org_id = org.id if org else "default_org"

    # Check key uniqueness for this entity_type and org
    existing = await db.execute(
        select(CustomField).where(
            CustomField.organization_id == org_id,
            CustomField.entity_type == field_in.entity_type.upper(),
            CustomField.field_key == field_in.field_key
        )
    )
    existing_field = existing.scalar_one_or_none()
    if existing_field:
        # Update existing field
        existing_field.label = field_in.label
        existing_field.field_type = field_in.field_type.upper()
        existing_field.options = field_in.options or []
        existing_field.is_required = field_in.is_required or False
        await db.commit()
        await db.refresh(existing_field)
        return existing_field

    cf = CustomField(
        organization_id=org_id,
        entity_type=field_in.entity_type.upper(),
        label=field_in.label,
        field_key=field_in.field_key,
        field_type=field_in.field_type.upper(),
        options=field_in.options or [],
        is_required=field_in.is_required or False
    )
    db.add(cf)
    await db.commit()
    await db.refresh(cf)
    return cf

@router.delete("/custom-fields/{field_id}")
async def delete_custom_field(
    field_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(CustomField).where(CustomField.id == field_id))
    cf = res.scalar_one_or_none()
    if not cf:
        raise HTTPException(status_code=404, detail="Custom field not found")
    await db.delete(cf)
    await db.commit()
    return {"message": "Custom field deleted successfully"}
