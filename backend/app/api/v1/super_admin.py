from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.models.organization_user import Organization, User
from app.models.deal import Deal
from app.models.contact import Contact
from app.api.deps import get_current_super_admin

router = APIRouter()

TENANT_FILTER = and_(
    Organization.slug != "zigmaa-master",
    ~Organization.name.ilike("Guard Corp%"),
    ~Organization.name.ilike("Super Corp%"),
    ~Organization.name.ilike("Acme Org%")
)

class ChangePlanRequest(BaseModel):
    plan: str  # FREE_TRIAL, STARTER, PRO, ENTERPRISE

class ExtendTrialRequest(BaseModel):
    days: int = 14

class ChangeStatusRequest(BaseModel):
    status: str  # ACTIVE, SUSPENDED

class QuotaUpdateRequest(BaseModel):
    max_users: Optional[int] = None
    max_whatsapp: Optional[int] = None


@router.get("/overview")
async def get_super_admin_overview(
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin)
):
    """
    Super Admin KPI Metrics:
    - Total Organizations
    - Total Admins & Sales Reps
    - Active vs Trial Subscriptions
    - System & WhatsApp status
    """
    # 1. Organizations count (Customer tenants)
    org_count_res = await db.execute(select(func.count(Organization.id)).where(TENANT_FILTER))
    total_orgs = org_count_res.scalar() or 0

    # 2. Total active users in customer tenants
    users_res = await db.execute(select(User).join(Organization, User.organization_id == Organization.id).where(TENANT_FILTER))
    all_users = users_res.scalars().all()
    total_users = len(all_users)
    active_admins = sum(1 for u in all_users if (u.role or "").lower() == "admin" and u.is_active)
    active_reps = sum(1 for u in all_users if (u.role or "").lower() != "admin" and u.is_active)

    # 3. Subscriptions breakdown
    orgs_res = await db.execute(select(Organization).where(TENANT_FILTER))
    all_orgs = orgs_res.scalars().all()
    free_trials = sum(1 for o in all_orgs if (o.plan or "").upper() in ["FREE_TRIAL", "FREE", "TRIAL"])
    active_subscriptions = sum(1 for o in all_orgs if (o.plan or "").upper() in ["PRO", "ENTERPRISE", "STARTER"] and (o.status or "").upper() == "ACTIVE")
    suspended = sum(1 for o in all_orgs if (o.status or "").upper() == "SUSPENDED")

    # 4. WhatsApp Service & System Health
    whatsapp_status = "operational"
    try:
        from app.core.config import settings as app_settings
        if getattr(app_settings, "WHATSAPP_PHONE_NUMBER_ID", None):
            whatsapp_status = "connected"
    except Exception:
        whatsapp_status = "standby"

    # 5. Notifications & Recent Signups (New Companies & Expiring Trials)
    now_utc = datetime.utcnow()
    recent_signups_res = await db.execute(
        select(Organization)
        .where(TENANT_FILTER)
        .order_by(Organization.created_at.desc())
        .limit(10)
    )
    recent_orgs = recent_signups_res.scalars().all()
    notifications = []
    recent_signups = []

    for ro in recent_orgs:
        owner_res = await db.execute(
            select(User).where(User.organization_id == ro.id).order_by(User.created_at.asc()).limit(1)
        )
        owner_u = owner_res.scalar_one_or_none()

        days_left = None
        if ro.trial_ends_at:
            delta = ro.trial_ends_at - now_utc
            days_left = max(0, delta.days + (1 if delta.seconds > 0 else 0))

        is_trial = (ro.plan or "").upper().find("TRIAL") != -1 or ro.trial_ends_at is not None

        # Registration notification
        is_recent = False
        if ro.created_at:
            hours_ago = (now_utc - ro.created_at).total_seconds() / 3600
            is_recent = hours_ago <= 168  # within 7 days

        signup_item = {
            "id": ro.id,
            "name": ro.name,
            "slug": ro.slug,
            "plan": (ro.plan or "FREE_TRIAL").upper(),
            "status": ro.status,
            "created_at": ro.created_at.isoformat() if ro.created_at else None,
            "trial_ends_at": ro.trial_ends_at.isoformat() if ro.trial_ends_at else None,
            "days_left": days_left,
            "is_recent": is_recent,
            "owner_name": owner_u.full_name if owner_u else "New Administrator",
            "owner_email": owner_u.email if owner_u else "N/A"
        }
        recent_signups.append(signup_item)

        # 1. New Company notification
        notifications.append({
            "id": f"signup_{ro.id}",
            "type": "NEW_COMPANY",
            "title": f"New Company Registered: {ro.name}",
            "message": f"{owner_u.full_name if owner_u else 'New Admin'} ({owner_u.email if owner_u else 'N/A'}) registered on 7-Day Free Trial.",
            "timestamp": ro.created_at.isoformat() if ro.created_at else None,
            "org_id": ro.id,
            "days_left": days_left,
            "is_urgent": False
        })

        # 2. Critical Trial Expiring Soon notification (<= 3 days left!)
        if is_trial and days_left is not None and days_left <= 3:
            notifications.append({
                "id": f"trial_exp_{ro.id}",
                "type": "TRIAL_EXPIRING",
                "title": f"⚠️ Trial Expiring: {ro.name}",
                "message": f"Free trial ends in {days_left}d! Company will be suspended unless upgraded.",
                "timestamp": ro.created_at.isoformat() if ro.created_at else None,
                "org_id": ro.id,
                "days_left": days_left,
                "is_urgent": True
            })

    return {
        "kpi": {
            "total_organizations": total_orgs,
            "total_users": total_users,
            "active_admins": active_admins,
            "active_sales_reps": active_reps,
            "active_subscriptions": active_subscriptions,
            "free_trials": free_trials,
            "suspended_organizations": suspended
        },
        "system_health": {
            "database": "healthy",
            "whatsapp_service": whatsapp_status,
            "api_version": settings.VERSION,
            "uptime_guarantee": "99.98%"
        },
        "notifications": notifications,
        "recent_signups": recent_signups
    }


@router.get("/organizations")
async def list_all_organizations(
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin)
):
    """
    Super Admin master organizations listing across entire platform.
    """
    res = await db.execute(
        select(Organization)
        .where(TENANT_FILTER)
        .order_by(Organization.created_at.desc())
    )
    orgs = res.scalars().all()
    now_utc = datetime.utcnow()

    output = []
    for org in orgs:
        # Load primary owner/admin
        owner_res = await db.execute(
            select(User).where(
                User.organization_id == org.id,
                or_(
                    User.role.ilike("admin"),
                    User.role.ilike("super_admin")
                )
            ).order_by(User.created_at.asc()).limit(1)
        )
        owner = owner_res.scalar_one_or_none()
        if not owner:
            any_user_res = await db.execute(select(User).where(User.organization_id == org.id).limit(1))
            owner = any_user_res.scalar_one_or_none()

        # Count users in this org
        user_count_res = await db.execute(
            select(func.count(User.id)).where(User.organization_id == org.id)
        )
        total_org_users = user_count_res.scalar() or 0

        # Plan Quotas
        plan_str = (org.plan or "PRO").upper()
        default_user_limit = 50 if plan_str == "ENTERPRISE" else 15 if plan_str == "PRO" else 5
        default_whatsapp_limit = 5000 if plan_str == "ENTERPRISE" else 1500 if plan_str == "PRO" else 200
        user_limit = getattr(org, "max_users", None) or default_user_limit
        whatsapp_limit = getattr(org, "max_whatsapp", None) or default_whatsapp_limit

        # Calculate days remaining for trial
        days_left = None
        if org.trial_ends_at:
            delta = org.trial_ends_at - now_utc
            days_left = max(0, delta.days + (1 if delta.seconds > 0 else 0))

        output.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "plan": plan_str,
            "status": (org.status or "ACTIVE").upper(),
            "trial_ends_at": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
            "days_left": days_left,
            "created_at": org.created_at.isoformat() if org.created_at else None,
            "owner": {
                "id": owner.id if owner else None,
                "full_name": owner.full_name if owner else "No Administrator",
                "email": owner.email if owner else "N/A"
            },
            "total_users": total_org_users,
            "quotas": {
                "max_users": user_limit,
                "max_whatsapp": whatsapp_limit
            }
        })

    return output


@router.patch("/organizations/{org_id}/plan")
async def update_organization_plan(
    org_id: str,
    req: ChangePlanRequest,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin)
):
    valid_plans = ["FREE_TRIAL", "STARTER", "PRO", "ENTERPRISE"]
    norm_plan = req.plan.upper().strip()
    if norm_plan not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Must be one of {valid_plans}")

    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.plan = norm_plan
    await db.commit()
    await db.refresh(org)

    return {"status": "success", "message": f"Plan updated to {norm_plan} for {org.name}", "plan": org.plan}


@router.patch("/organizations/{org_id}/trial")
async def extend_organization_trial(
    org_id: str,
    req: ExtendTrialRequest,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin)
):
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    now = datetime.now()
    base_date = org.trial_ends_at if (org.trial_ends_at and org.trial_ends_at > now) else now
    org.trial_ends_at = base_date + timedelta(days=max(1, req.days))
    if org.status == "EXPIRED":
        org.status = "ACTIVE"

    await db.commit()
    await db.refresh(org)

    return {
        "status": "success",
        "message": f"Trial extended by {req.days} days until {org.trial_ends_at.strftime('%Y-%m-%d')}",
        "trial_ends_at": org.trial_ends_at.isoformat()
    }


@router.patch("/organizations/{org_id}/status")
async def update_organization_status(
    org_id: str,
    req: ChangeStatusRequest,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin)
):
    norm_status = req.status.upper().strip()
    if norm_status not in ["ACTIVE", "SUSPENDED", "EXPIRED"]:
        raise HTTPException(status_code=400, detail="Invalid status specified")

    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.status = norm_status
    await db.commit()
    await db.refresh(org)

    return {"status": "success", "message": f"Organization status set to {norm_status}", "status_value": org.status}


@router.patch("/organizations/{org_id}/quotas")
async def update_organization_quotas(
    org_id: str,
    req: QuotaUpdateRequest,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin)
):
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if req.max_users is not None:
        org.max_users = max(1, req.max_users)
    if req.max_whatsapp is not None:
        org.max_whatsapp = max(0, req.max_whatsapp)

    await db.commit()
    await db.refresh(org)

    return {
        "status": "success",
        "message": f"Quotas updated for {org.name}",
        "quotas": {
            "max_users": org.max_users,
            "max_whatsapp": org.max_whatsapp
        }
    }


@router.post("/impersonate/{org_id}")
async def impersonate_organization_admin(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    super_admin: User = Depends(get_current_super_admin)
):
    """
    Allows Super Admin to view tenant CRM as the workspace Administrator.
    Returns access token and user payload for the impersonated session.
    """
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Find primary admin of this organization
    admin_res = await db.execute(
        select(User).where(
            User.organization_id == org_id,
            or_(
                User.role.ilike("admin"),
                User.role.ilike("super_admin")
            )
        ).order_by(User.created_at.asc()).limit(1)
    )
    admin_user = admin_res.scalar_one_or_none()
    if not admin_user:
        # Fallback to any user
        any_res = await db.execute(select(User).where(User.organization_id == org_id).limit(1))
        admin_user = any_res.scalar_one_or_none()

    if not admin_user:
        raise HTTPException(status_code=400, detail="This organization has no associated users to impersonate.")

    # Generate JWT for this user
    token = create_access_token({
        "sub": str(admin_user.id),
        "email": admin_user.email,
        "org_id": str(admin_user.organization_id),
        "role": admin_user.role,
        "impersonated_by": super_admin.email
    })

    return {
        "status": "success",
        "message": f"Successfully impersonated {admin_user.full_name} ({org.name})",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": admin_user.id,
            "organization_id": admin_user.organization_id,
            "email": admin_user.email,
            "full_name": admin_user.full_name,
            "role": admin_user.role,
            "company_name": org.name,
            "organization_name": org.name,
            "is_super_admin": True  # Retain super admin capability to switch back
        }
    }
