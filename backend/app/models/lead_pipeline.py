from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedBase

class Lead(TimeStampedBase):
    __tablename__ = "leads"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    source = Column(String(50), default="META_ADS")  # META_ADS, GOOGLE_ADS, WEBSITE_FORM, CSV_IMPORT, MANUAL
    status = Column(String(50), default="NEW")  # NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED
    custom_fields = Column(JSON, default=dict)
    tags = Column(JSON, default=list)
    assigned_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)

    organization = relationship("Organization", back_populates="leads")
    deals = relationship("Deal", back_populates="lead")
    activities = relationship("Activity", back_populates="lead", cascade="all, delete-orphan")

class Pipeline(TimeStampedBase):
    __tablename__ = "pipelines"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)  # Direct Sales, Enterprise B2B
    is_default = Column(Boolean, default=False)

    organization = relationship("Organization", back_populates="pipelines")
    stages = relationship("PipelineStage", back_populates="pipeline", order_by="PipelineStage.stage_order", cascade="all, delete-orphan")

class PipelineStage(TimeStampedBase):
    __tablename__ = "pipeline_stages"

    pipeline_id = Column(String(36), ForeignKey("pipelines.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)  # Lead In, Contact Made, Proposal Sent, Negotiation, Won, Lost
    stage_order = Column(Integer, nullable=False, default=0)
    probability = Column(Integer, default=50)  # 0-100
    color_code = Column(String(20), default="#6366F1")

    pipeline = relationship("Pipeline", back_populates="stages")
    deals = relationship("Deal", back_populates="stage")
