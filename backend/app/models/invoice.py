from sqlalchemy import Column, String, Float, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedBase

class Invoice(TimeStampedBase):
    __tablename__ = "invoices"

    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    deal_id = Column(String(36), ForeignKey("deals.id"), nullable=True)
    invoice_number = Column(String(50), nullable=False, unique=True)
    items = Column(JSON, nullable=False)  # list of {name, qty, unit_price, total}
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    payment_status = Column(String(50), default="PAID")  # UNPAID, PAID, PARTIAL
    due_date = Column(String(50), nullable=True)

    organization = relationship("Organization", back_populates="invoices")
    deal = relationship("Deal", back_populates="invoices")
