from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.organization_user import User, Organization
from app.models.deal import Deal
from app.models.contact import Contact
from app.api.deps import get_current_user, get_current_admin

router = APIRouter()

class InviteMemberRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "sales_rep"  # admin, sales_rep

class UpdateRoleRequest(BaseModel):
    role: str  # admin, sales_rep

@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK)
async def list_team_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Strict Organization-Scoped Team Members Query.
    Never returns users from other organizations or seed accounts.
    """
    if not current_user.organization_id:
        return []

    query = (
        select(User)
        .where(User.organization_id == current_user.organization_id)
        .order_by(User.created_at.asc())
    )
    res = await db.execute(query)
    users = res.scalars().all()

    members = []
    for u in users:
        # Count deals assigned to this user strictly within this organization
        deals_count_res = await db.execute(
            select(func.count(Deal.id)).where(
                Deal.organization_id == current_user.organization_id,
                or_(
                    Deal.assigned_user_id == u.id,
                    Deal.owner_id == u.id,
                    Deal.owner_name.ilike(f"%{u.full_name}%")
                )
            )
        )
        deals_count = deals_count_res.scalar() or 0

        # Count leads / contacts assigned to this user strictly within this organization
        contacts_count_res = await db.execute(
            select(func.count(Contact.id)).where(
                Contact.organization_id == current_user.organization_id,
                or_(
                    Contact.assigned_user_id == u.id,
                    Contact.owner_id == u.id,
                    Contact.owner_name.ilike(f"%{u.full_name}%"),
                    Contact.assigned_user_name.ilike(f"%{u.full_name}%")
                )
            )
        )
        contacts_count = contacts_count_res.scalar() or 0

        members.append({
            "id": u.id,
            "organization_id": u.organization_id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "assigned_deals_count": deals_count,
            "assigned_leads_count": contacts_count,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })

    return members

@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    req: InviteMemberRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    clean_email = req.email.lower().strip()
    raw_role = (req.role or "").strip().lower()
    norm_role = "admin" if "admin" in raw_role else "sales_rep"

    # Check if user already exists
    existing_res = await db.execute(select(User).where(User.email == clean_email))
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email {clean_email} already exists."
        )

    # Strictly assign the inviting admin's organization_id
    org_id = admin_user.organization_id
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Creator does not have a linked organization."
        )

    # Create new user with temporary secure initial password
    temp_pass = "Zigmaa@2026"
    new_user = User(
        organization_id=org_id,
        email=clean_email,
        full_name=req.full_name.strip(),
        role=norm_role,
        is_active=True,
        hashed_password=get_password_hash(temp_pass)
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "status": "success",
        "message": f"Successfully invited {new_user.full_name} ({new_user.email}) as {new_user.role}.",
        "user": {
            "id": new_user.id,
            "organization_id": new_user.organization_id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "role": new_user.role,
            "is_active": new_user.is_active,
            "assigned_deals_count": 0,
            "assigned_leads_count": 0,
            "created_at": new_user.created_at.isoformat() if new_user.created_at else None
        }
    }

@router.patch("/{user_id}/role")
async def update_member_role(
    user_id: str,
    req: UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    raw_role = (req.role or "").strip().lower()
    norm_role = "admin" if "admin" in raw_role else "sales_rep"

    # Verify target user belongs strictly to the admin's organization
    res = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == admin_user.organization_id
        )
    )
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in your organization.")

    # Prevent users from demoting or modifying their own role
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role. Another administrator must update your role permissions."
        )

    # Enforce that an organization must always retain at least 1 active Admin
    if (user.role or "").lower() == "admin" and norm_role != "admin":
        admin_count_res = await db.execute(
            select(func.count(User.id)).where(
                User.organization_id == admin_user.organization_id,
                User.is_active == True,
                or_(
                    User.role.ilike("admin"),
                    User.role.ilike("super_admin")
                )
            )
        )
        active_admins = admin_count_res.scalar() or 0
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization must always retain at least 1 active Administrator."
            )

    user.role = norm_role
    await db.commit()
    await db.refresh(user)

    return {
        "status": "success",
        "message": f"Role updated to {norm_role} for {user.full_name}",
        "user_id": user.id,
        "role": user.role
    }

@router.delete("/{user_id}")
async def remove_team_member(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    # Verify target user belongs strictly to the admin's organization
    res = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == admin_user.organization_id
        )
    )
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in your organization.")

    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own active administrator account.")

    # Enforce that an organization must always retain at least 1 active Admin
    if (user.role or "").lower() == "admin":
        admin_count_res = await db.execute(
            select(func.count(User.id)).where(
                User.organization_id == admin_user.organization_id,
                User.is_active == True,
                or_(
                    User.role.ilike("admin"),
                    User.role.ilike("super_admin")
                )
            )
        )
        active_admins = admin_count_res.scalar() or 0
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization must always retain at least 1 active Administrator."
            )

    # Soft delete / deactivate or remove
    user.is_active = False
    await db.delete(user)
    await db.commit()

    return {
        "status": "success",
        "message": f"Team member {user.full_name} has been removed."
    }
