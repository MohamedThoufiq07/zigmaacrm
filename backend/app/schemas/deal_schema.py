from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DealBase(BaseModel):
    title: str
    pipeline_id: str
    stage_id: str
    lead_id: Optional[str] = None
    deal_value: float = 0.0
    currency: str = "INR"
    expected_close_date: Optional[str] = None
    status: Optional[str] = "OPEN"

class DealCreate(DealBase):
    pass

class DealStageMove(BaseModel):
    stage_id: str

class DealOut(DealBase):
    id: str
    organization_id: str
    assigned_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
