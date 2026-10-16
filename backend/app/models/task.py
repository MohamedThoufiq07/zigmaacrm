from sqlalchemy import Column, String, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedBase, generate_uuid

class Task(TimeStampedBase):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    activity_type = Column(String(50), default="To-Do")  # Call, WhatsApp, Email, Meeting, To-Do
    due_date = Column(String(50), nullable=True)          # e.g. "2026-10-16"
    due_time = Column(String(50), nullable=True)          # e.g. "04:30 PM"
    priority = Column(String(50), default="Medium")       # Low, Medium, High, Urgent
    status = Column(String(50), default="PENDING")        # PENDING, COMPLETED, IN_PROGRESS
    assigned_to = Column(String(255), default="Mohamed Thoufiq")
    description = Column(Text, nullable=True)
    
    # Associated contact
    contact_id = Column(String(36), ForeignKey("contacts.id"), nullable=True, index=True)
    contact_name = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_company = Column(String(255), nullable=True)

    # Relationships
    contact = relationship("Contact", backref="tasks", lazy="joined")
