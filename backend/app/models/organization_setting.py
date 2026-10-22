from sqlalchemy import Column, String, Text, DateTime, func
from app.models.base import TimeStampedBase, generate_uuid

class OrganizationSetting(TimeStampedBase):
    __tablename__ = "organization_settings"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), nullable=True, index=True)
    company_name = Column(String(255), default="Zigmaa Workspace")
    logo_url = Column(Text, nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), default="+91 98765 43210")
    address = Column(Text, default="Chennai Tech Park, Guindy, Chennai, Tamil Nadu 600032")
    gstin = Column(String(50), default="33AAECZ9920K1ZX")
    website = Column(String(255), default="https://zigmaa.com")
    signatory_name = Column(String(255), default="Authorized Officer")
    signatory_designation = Column(String(255), default="Authorized Signatory")
    bank_name = Column(String(255), default="HDFC Bank Ltd")
    account_number = Column(String(100), default="50200084729104")
    ifsc_code = Column(String(50), default="HDFC0001244")
    upi_id = Column(String(100), default="zigmaa@hdfcbank")
    default_terms = Column(Text, default="Payment terms: 50% advance, balance upon project milestone delivery. Bank Transfer / UPI accepted.")
    twilio_account_sid = Column(String(255), nullable=True)
    twilio_auth_token = Column(String(255), nullable=True)
    twilio_caller_id = Column(String(50), nullable=True)
    twilio_twiml_app_sid = Column(String(255), nullable=True)
