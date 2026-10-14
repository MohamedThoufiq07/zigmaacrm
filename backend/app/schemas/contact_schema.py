from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ContactBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[str] = "New"
    lifecycle_stage: Optional[str] = "New"
    source: Optional[str] = "Manual"
    custom_data: Optional[Dict[str, Any]] = {}

class ContactCreate(ContactBase):
    pass

class ContactOut(ContactBase):
    id: str
    organization_id: str
    assigned_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    total_deals: Optional[int] = 0
    lifetime_value: Optional[float] = 0.0

    class Config:
        from_attributes = True
