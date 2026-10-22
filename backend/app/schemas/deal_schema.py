from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DealBase(BaseModel):
    title: str
    pipeline_id: Optional[str] = None
    stage_id: Optional[str] = None
    lead_id: Optional[str] = None
    contact_id: Optional[str] = None
    deal_value: float = 0.0
    currency: str = "INR"
    expected_close_date: Optional[str] = None
    status: Optional[str] = "OPEN"
    custom_data: Optional[dict] = {}
    custom_properties: Optional[dict] = {}
    assigned_user_id: Optional[str] = None
    assigned_user_name: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None

class DealCreate(DealBase):
    pass

class DealStageMove(BaseModel):
    stage_id: str

class DealOut(DealBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
