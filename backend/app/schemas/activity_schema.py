from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ActivityCreate(BaseModel):
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    type: str  # CALL, WHATSAPP, EMAIL, NOTE, STAGE_CHANGE
    notes: str
    status: Optional[str] = "COMPLETED"
    scheduled_at: Optional[datetime] = None

class ActivityOut(ActivityCreate):
    id: str
    organization_id: str
    user_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
