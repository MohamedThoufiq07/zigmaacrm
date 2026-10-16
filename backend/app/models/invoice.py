from sqlalchemy import Column, String, Numeric, ForeignKey, JSON, DateTime, Text, Date, func
from sqlalchemy.orm import relationship
from datetime import date
from app.models.base import TimeStampedBase, generate_uuid

class Invoice(TimeStampedBase):
    __tablename__ = "invoices"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    invoice_number = Column(String(50), nullable=False, unique=True, index=True)
    deal_id = Column(String(36), ForeignKey("deals.id"), nullable=True, index=True)
    contact_id = Column(String(36), ForeignKey("contacts.id"), nullable=True, index=True)
    
    client_name = Column(String(255), nullable=False)
    client_company = Column(String(255), nullable=True)
    client_email = Column(String(255), nullable=True)
    client_phone = Column(String(50), nullable=True)
    
    type = Column(String(20), default="QUOTE")  # QUOTE, INVOICE
    status = Column(String(20), default="DRAFT")  # DRAFT, SENT, PAID, OVERDUE
    
    issue_date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=True)
    
    items = Column(JSON, default=list)  # Array of { description, qty, unit_price, tax_rate, amount }
    subtotal = Column(Numeric(12, 2), default=0.00)
    tax_amount = Column(Numeric(12, 2), default=0.00)
    discount = Column(Numeric(12, 2), default=0.00)
    total_amount = Column(Numeric(12, 2), default=0.00)
    
    notes = Column(Text, nullable=True)

    organization = relationship("Organization", back_populates="invoices")
    deal = relationship("Deal", back_populates="invoices")
    contact = relationship("Contact", backref="invoices", lazy="joined")
