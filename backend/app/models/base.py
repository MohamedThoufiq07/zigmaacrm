import uuid
from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class TimeStampedBase(Base):
    __abstract__ = True

    id = Column(String(36), primary_key=True, default=generate_uuid)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
