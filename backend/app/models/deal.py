from sqlalchemy import Column, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedBase

class Deal(TimeStampedBase):
    __tablename__ = "deals"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    pipeline_id = Column(String(36), ForeignKey("pipelines.id"), nullable=False, index=True)
    stage_id = Column(String(36), ForeignKey("pipeline_stages.id"), nullable=False, index=True)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=True)
    contact_id = Column(String(36), ForeignKey("contacts.id"), nullable=True)
    title = Column(String(255), nullable=False)
    deal_value = Column(Float, default=0.0)
    currency = Column(String(10), default="INR")  # INR, USD
    expected_close_date = Column(String(50), nullable=True)
    assigned_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    owner_name = Column(String(255), nullable=True)
    status = Column(String(50), default="OPEN")  # OPEN, WON, LOST
    custom_data = Column(JSON, default=dict)
    custom_properties = Column(JSON, default=dict)

    organization = relationship("Organization", back_populates="deals")
    stage = relationship("PipelineStage", back_populates="deals")
    lead = relationship("Lead", back_populates="deals")
    contact = relationship("Contact", back_populates="deals")
    activities = relationship("Activity", back_populates="deal", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="deal")
