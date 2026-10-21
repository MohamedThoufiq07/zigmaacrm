from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedBase

class Organization(TimeStampedBase):
    __tablename__ = "organizations"

    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    plan = Column(String(50), default="PRO")  # FREE_TRIAL, STARTER, PRO, ENTERPRISE
    trial_ends_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, EXPIRED, SUSPENDED

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="organization", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="organization", cascade="all, delete-orphan")
    pipelines = relationship("Pipeline", back_populates="organization", cascade="all, delete-orphan")
    deals = relationship("Deal", back_populates="organization", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="organization", cascade="all, delete-orphan")

class User(TimeStampedBase):
    __tablename__ = "users"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="SALES_REP")  # SUPER_ADMIN, ADMIN, SALES_MANAGER, SALES_REP
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)

    organization = relationship("Organization", back_populates="users")

