import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.organization_user import User, Organization
from app.models.otp import PasswordResetOTP
from app.core.email import send_otp_email
from app.schemas.auth_schema import (
    UserLogin, UserCreate, GoogleLoginSchema, TokenResponse, UserOut,
    SendOtpRequest, VerifyOtpRequest, ResetPasswordRequest, SimpleMessageResponse,
    ChangePasswordRequest, UpdateProfileRequest
)

router = APIRouter()

@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleLoginSchema, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account found with {clean_email}. Please register or sign up first."
        )

    token = create_access_token({"sub": user.id, "org_id": user.organization_id, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
async def login(login_in: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_in.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    token = create_access_token({"sub": user.id, "org_id": user.organization_id, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check email
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create Org
    org_slug = user_in.organization_name.lower().replace(" ", "-") if user_in.organization_name else "zigmaa"
    org = Organization(name=user_in.organization_name or "Zigmaa Org", slug=f"{org_slug}-{abs(hash(user_in.email)) % 1000}")
    db.add(org)
    await db.flush()

    # Create User
    user = User(
        organization_id=org.id,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role or "ADMIN"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "org_id": user.organization_id, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/send-otp", response_model=SimpleMessageResponse)
@router.post("/forgot-password", response_model=SimpleMessageResponse)
async def send_otp(payload: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    
    # Check if user exists
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    # Generate cryptographically secure 6-digit OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Save to database
    otp_record = PasswordResetOTP(
        email=clean_email,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    await db.commit()

    # Send OTP email via SMTP
    try:
        await send_otp_email(clean_email, otp_code)
    except Exception as e:
        print(f"Error dispatching OTP email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send OTP email: {str(e)}"
        )

    return SimpleMessageResponse(
        message=f"Verification code sent successfully to {clean_email}"
    )

@router.post("/verify-otp", response_model=SimpleMessageResponse)
async def verify_otp(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    clean_otp = payload.otp.strip()

    # Fetch latest unused OTP for this email
    stmt = (
        select(PasswordResetOTP)
        .where(
            PasswordResetOTP.email == clean_email,
            PasswordResetOTP.otp_code == clean_otp,
            PasswordResetOTP.is_used == False
        )
        .order_by(PasswordResetOTP.created_at.desc())
    )
    result = await db.execute(stmt)
    otp_record = result.scalars().first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used verification code."
        )

    if datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    return SimpleMessageResponse(
        message="Verification code confirmed successfully."
    )

@router.post("/reset-password", response_model=SimpleMessageResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    clean_otp = payload.otp.strip()

    # Validate OTP
    stmt = (
        select(PasswordResetOTP)
        .where(
            PasswordResetOTP.email == clean_email,
            PasswordResetOTP.otp_code == clean_otp,
            PasswordResetOTP.is_used == False
        )
        .order_by(PasswordResetOTP.created_at.desc())
    )
    result = await db.execute(stmt)
    otp_record = result.scalars().first()

    if not otp_record or datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code."
        )

    # Mark OTP as used
    otp_record.is_used = True

    # Find user and update password
    user_res = await db.execute(select(User).where(User.email == clean_email))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()

    return SimpleMessageResponse(
        message="Password has been reset successfully. You can now log in with your new password."
    )

@router.post("/change-password", response_model=SimpleMessageResponse)
async def change_password(payload: ChangePasswordRequest, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found."
        )

    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters."
        )

    user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()

    return SimpleMessageResponse(
        message="Password updated successfully."
    )

@router.post("/update-profile", response_model=UserOut)
async def update_profile(payload: UpdateProfileRequest, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if payload.full_name:
        user.full_name = payload.full_name.strip()

    if payload.new_email and payload.new_email.lower().strip() != clean_email:
        new_clean = payload.new_email.lower().strip()
        existing = await db.execute(select(User).where(User.email == new_clean))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use by another account."
            )
        user.email = new_clean

    if payload.organization_name and user.organization_id:
        org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
        org = org_res.scalar_one_or_none()
        if org:
            org.name = payload.organization_name.strip()

    await db.commit()
    await db.refresh(user)

    return UserOut.model_validate(user)
