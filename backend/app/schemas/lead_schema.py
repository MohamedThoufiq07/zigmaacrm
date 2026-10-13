from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class LeadBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: str
    company_name: Optional[str] = None
    source: Optional[str] = "META_ADS"
    status: Optional[str] = "NEW"
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    tags: Optional[List[str]] = Field(default_factory=list)
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    assigned_user_id: Optional[str] = None

class LeadOut(LeadBase):
    id: str
    organization_id: str
    assigned_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


    class Config:
        from_attributes = True

class BulkUploadResponse(BaseModel):
    success_count: int
    duplicate_count: int
    total_processed: int
    message: str
