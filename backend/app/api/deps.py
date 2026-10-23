from fastapi import Depends, HTTPException, Header, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from jose import jwt, JWTError, ExpiredSignatureError

from app.core.database import get_db
from app.core.config import settings
from app.models.organization_user import User

security = HTTPBearer(auto_error=False)

async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    simulate_role: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Strict JWT Bearer Token Authentication Dependency.
    Extracts Bearer token, validates cryptographic signature and expiry,
    and loads the active authenticated User directly from PostgreSQL.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = auth.credentials.strip().strip('"').strip("'")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials. Invalid token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user subject.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Load verified user from database
    res = await db.execute(select(User).where(User.id == str(user_id)))
    user = res.scalar_one_or_none()

    if not user and payload.get("email"):
        res = await db.execute(select(User).where(User.email == payload.get("email").lower().strip()))
        user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token was not found.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact your workspace administrator.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Role simulation only allowed for authenticated ADMIN / SUPER_ADMIN
    effective_role = simulate_role or x_user_role
    if effective_role and (user.role or "").lower() in ["admin", "super_admin"]:
        norm_role = effective_role.lower()
        if norm_role in ["sales_rep", "admin", "super_admin", "manager"]:
            user.role = norm_role

    return user

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if (current_user.role or "").lower() not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to perform this action."
        )
    return current_user

async def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Optional user dependency. If a valid Bearer token is provided, returns the active User.
    If no token or invalid token, returns None without raising an HTTPException.
    """
    if not auth or not auth.credentials:
        return None
    token = auth.credentials.strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        res = await db.execute(select(User).where(User.id == str(user_id)))
        user = res.scalar_one_or_none()
        if not user and payload.get("email"):
            res = await db.execute(select(User).where(User.email == payload.get("email").lower().strip()))
            user = res.scalar_one_or_none()
        if user and user.is_active:
            return user
    except Exception:
        return None
    return None

