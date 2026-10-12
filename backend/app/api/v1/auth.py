from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.organization_user import User, Organization
from app.schemas.auth_schema import UserLogin, UserCreate, GoogleLoginSchema, TokenResponse, UserOut

router = APIRouter()

@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleLoginSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        org_name = f"{payload.name}'s Organization" if payload.name else "My Team"
        org_slug = org_name.lower().replace(" ", "-")
        org = Organization(name=org_name, slug=f"{org_slug}-{abs(hash(payload.email)) % 1000}")
        db.add(org)
        await db.flush()

        user = User(
            organization_id=org.id,
            email=payload.email,
            hashed_password=get_password_hash("google_oauth_verified"),
            full_name=payload.name or "Google User",
            role="ADMIN"
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
    org_slug = user_in.organization_name.lower().replace(" ", "-")
    org = Organization(name=user_in.organization_name, slug=f"{org_slug}-{int(user_in.email.__hash__() % 1000)}")
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
