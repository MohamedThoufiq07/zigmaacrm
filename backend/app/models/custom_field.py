from sqlalchemy import Column, String, Boolean, ForeignKey, JSON
from app.models.base import TimeStampedBase

class CustomField(TimeStampedBase):
    __tablename__ = "custom_fields"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # LEAD, CONTACT, DEAL
    label = Column(String(255), nullable=False)
    field_key = Column(String(100), nullable=False)
    field_type = Column(String(50), nullable=False)  # TEXT, NUMBER, SELECT, DATE, BOOLEAN
    options = Column(JSON, default=list)
    is_required = Column(Boolean, default=False)
