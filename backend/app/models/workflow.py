from sqlalchemy import Column, String, Boolean, ForeignKey, JSON, Text, DateTime
from datetime import datetime
from app.models.base import TimeStampedBase, Base, generate_uuid

class Workflow(TimeStampedBase):
    __tablename__ = "workflows"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    module = Column(String(50), nullable=False, default="CONTACT")  # CONTACT, DEAL
    trigger_event = Column(String(100), nullable=False)  # CONTACT_CREATED, STAGE_CHANGED, TASK_OVERDUE
    conditions = Column(JSON, default=dict)  # e.g. {"source": "META_ADS"}
    actions = Column(JSON, default=list)  # e.g. [{"action": "SEND_WHATSAPP", "template": "welcome"}]
    is_active = Column(Boolean, default=True)

class WorkflowLog(Base):
    __tablename__ = "workflow_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workflow_id = Column(String(36), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id = Column(String(36), nullable=True)
    action_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="SUCCESS")  # SUCCESS, FAILED
    error_message = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
