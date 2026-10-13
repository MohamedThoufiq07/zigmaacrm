from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
from app.models.base import TimeStampedBase

class PasswordResetOTP(TimeStampedBase):
    __tablename__ = "password_reset_otps"

    email = Column(String(255), nullable=False, index=True)
    otp_code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
