from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedBase, generate_uuid

# Support both JSONB on PostgreSQL and JSON fallback
JsonType = JSON().with_variant(JSONB, "postgresql")

class Contact(TimeStampedBase):
    __tablename__ = "contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True, default="", index=True)
    email = Column(String(255), nullable=True, index=True)
    company_name = Column(String(255), nullable=True)
    designation = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    source = Column(String(50), default="MANUAL")
    status = Column(String(50), default="NEW")
    lifecycle_stage = Column(String(50), default="NEW")
    custom_data = Column(JsonType, default=dict)
    assigned_user_name = Column(String(255), default="Mohamed Thoufiq")
    assigned_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    owner_name = Column(String(255), default="Mohamed Thoufiq")

    organization = relationship("Organization", back_populates="contacts")
    deals = relationship("Deal", back_populates="contact")
    activities = relationship("Activity", back_populates="contact")
