from sqlalchemy import Column, String, Boolean, ForeignKey, JSON
from app.models.base import TimeStampedBase, generate_uuid

class CustomField(TimeStampedBase):
    __tablename__ = "custom_fields"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    module = Column(String(50), nullable=True, index=True)  # contacts, deals, companies
    entity_type = Column(String(50), nullable=True, index=True)  # backward compat
    label = Column(String(255), nullable=False)
    key = Column(String(100), nullable=True, index=True)  # gst_number
    field_key = Column(String(100), nullable=True)  # backward compat
    field_type = Column(String(50), nullable=False)  # text, number, select, date, boolean
    options = Column(JSON, default=list, nullable=True)
    is_required = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
