from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedBase

class Contact(TimeStampedBase):
    __tablename__ = "contacts"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    status = Column(String(50), default="New")  # New, Contacted, Interested, Qualified, Customer
    lifecycle_stage = Column(String(50), default="New")  # New, Contacted, Interested, Qualified, Customer
    source = Column(String(50), default="Manual")  # Meta Ads, Google Ads, Website, Manual
    custom_data = Column(JSON, default=dict)
    assigned_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    organization = relationship("Organization", back_populates="contacts")
    deals = relationship("Deal", back_populates="contact")
