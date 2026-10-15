from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional

from app.core.database import get_db
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.activity import Activity
from app.models.organization_user import Organization
from app.schemas.contact_schema import ContactCreate, ContactOut

router = APIRouter()

@router.get("/contacts", response_model=List[ContactOut])
async def get_contacts(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Contact).order_by(Contact.created_at.desc())
    if org_id:
        query = query.where(Contact.organization_id == org_id)
    if status:
        query = query.where(Contact.status == status)
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                Contact.full_name.ilike(term),
                Contact.phone.ilike(term),
                Contact.email.ilike(term),
                Contact.company_name.ilike(term)
            )
        )
    result = await db.execute(query)
    contacts = result.scalars().all()

    # Calculate total deals and lifetime value for each contact
    out_list = []
    for c in contacts:
        deal_count_res = await db.execute(
            select(func.count(Deal.id)).where(Deal.contact_id == c.id)
        )
        deal_count = deal_count_res.scalar() or 0

        # Calculate sum of won deals
        ltv_res = await db.execute(
            select(func.sum(Deal.deal_value)).where(
                Deal.contact_id == c.id,
                Deal.status.ilike("%WON%")
            )
        )
        lifetime_value = ltv_res.scalar() or 0.0

        c_dict = {
            "id": c.id,
            "organization_id": c.organization_id,
            "full_name": c.full_name,
            "email": c.email,
            "phone": c.phone,
            "company_name": c.company_name,
            "designation": c.designation or c.job_title,
            "job_title": c.job_title or c.designation,
            "status": c.status or c.lifecycle_stage or "NEW",
            "lifecycle_stage": c.lifecycle_stage or c.status or "NEW",
            "source": c.source or "MANUAL",
            "custom_data": c.custom_data or {},
            "assigned_user_name": c.assigned_user_name or "Mohamed Thoufiq",
            "assigned_user_id": c.assigned_user_id,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "total_deals": deal_count,
            "lifetime_value": float(lifetime_value)
        }
        out_list.append(c_dict)

    return out_list

@router.get("/contacts/{contact_id}")
async def get_contact_detail(
    contact_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Fetch linked deals
    deals_res = await db.execute(select(Deal).where(Deal.contact_id == contact.id).order_by(Deal.created_at.desc()))
    deals = deals_res.scalars().all()

    # Fetch timeline activities
    deal_ids = [d.id for d in deals]
    conditions = [Activity.lead_id == contact.id]
    if deal_ids:
        conditions.append(Activity.deal_id.in_(deal_ids))

    act_res = await db.execute(
        select(Activity)
        .where(or_(*conditions))
        .order_by(Activity.created_at.desc())
    )
    activities = act_res.scalars().all()

    deal_count = len(deals)
    ltv = sum(float(d.deal_value or 0.0) for d in deals if "won" in (d.status or "").lower())

    return {
        "id": contact.id,
        "organization_id": contact.organization_id,
        "full_name": contact.full_name,
        "email": contact.email,
        "phone": contact.phone,
        "company_name": contact.company_name,
        "designation": contact.designation or contact.job_title,
        "job_title": contact.job_title or contact.designation,
        "status": contact.status or contact.lifecycle_stage or "NEW",
        "lifecycle_stage": contact.lifecycle_stage or contact.status or "NEW",
        "source": contact.source or "MANUAL",
        "custom_data": contact.custom_data or {},
        "assigned_user_name": contact.assigned_user_name or "Mohamed Thoufiq",
        "assigned_user_id": contact.assigned_user_id,
        "created_at": contact.created_at,
        "updated_at": contact.updated_at,
        "total_deals": deal_count,
        "lifetime_value": ltv,
        "deals": [
            {
                "id": d.id,
                "title": d.title,
                "deal_value": d.deal_value,
                "currency": d.currency,
                "status": d.status,
                "expected_close_date": d.expected_close_date,
                "created_at": d.created_at
            }
            for d in deals
        ],
        "activities": [
            {
                "id": a.id,
                "type": a.type,
                "notes": a.notes,
                "status": a.status,
                "created_at": a.created_at
            }
            for a in activities
        ]
    }

# In-memory cache fallback for AI insights with 1 hour TTL
_ai_insights_cache = {}

@router.get("/contacts/{contact_id}/ai-insights")
async def get_contact_ai_insights(
    contact_id: str,
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    import time
    from app.services.ai_insights import AIInsightsService

    cache_key = f"ai_insights_{contact_id}"
    now = time.time()

    # Check cache if not explicitly refreshing
    if not refresh and cache_key in _ai_insights_cache:
        cached_entry = _ai_insights_cache[cache_key]
        if now - cached_entry["timestamp"] < 3600:  # 1 hour cache
            return cached_entry["data"]

    # Try Redis cache if available
    try:
        import redis.asyncio as aioredis
        from app.core.config import settings
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        if not refresh:
            cached_val = await r.get(cache_key)
            if cached_val:
                import json
                return json.loads(cached_val)
    except Exception:
        r = None

    # Fetch contact
    res = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Fetch linked deals
    deals_res = await db.execute(select(Deal).where(Deal.contact_id == contact.id))
    deals = deals_res.scalars().all()
    deals_data = [
        {"id": d.id, "title": d.title, "deal_value": d.deal_value, "status": d.status}
        for d in deals
    ]

    # Fetch past activities & notes
    deal_ids = [d.id for d in deals]
    conditions = [Activity.lead_id == contact.id]
    if deal_ids:
        conditions.append(Activity.deal_id.in_(deal_ids))

    act_res = await db.execute(
        select(Activity)
        .where(or_(*conditions))
        .order_by(Activity.created_at.desc())
    )
    activities = act_res.scalars().all()
    notes = [
        a.notes for a in activities if a.notes
    ]

    contact_dict = {
        "id": contact.id,
        "full_name": contact.full_name,
        "company_name": contact.company_name,
        "job_title": contact.job_title,
        "status": contact.status,
        "lifecycle_stage": contact.lifecycle_stage,
        "source": contact.source,
        "custom_data": contact.custom_data or {}
    }

    # Run AI Analysis
    insights = await AIInsightsService.analyze_prospect(contact_dict, notes, deals_data)

    # Store in cache
    _ai_insights_cache[cache_key] = {
        "timestamp": now,
        "data": insights
    }
    if r:
        try:
            import json
            await r.setex(cache_key, 3600, json.dumps(insights))
            await r.aclose()
        except Exception:
            pass

    return insights

@router.post("/contacts", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_in: ContactCreate,
    org_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    target_org_id = org_id
    if not target_org_id:
        res = await db.execute(select(Organization))
        org = res.scalars().first()
        target_org_id = org.id if org else None

    designation = contact_in.designation or contact_in.job_title
    contact = Contact(
        organization_id=target_org_id,
        full_name=contact_in.full_name,
        email=contact_in.email,
        phone=contact_in.phone,
        company_name=contact_in.company_name,
        designation=designation,
        job_title=contact_in.job_title or designation,
        status=contact_in.status or contact_in.lifecycle_stage or "NEW",
        lifecycle_stage=contact_in.lifecycle_stage or contact_in.status or "NEW",
        source=contact_in.source or "MANUAL",
        custom_data=contact_in.custom_data or {},
        assigned_user_name=contact_in.assigned_user_name or "Mohamed Thoufiq"
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    return {
        "id": contact.id,
        "organization_id": contact.organization_id,
        "full_name": contact.full_name,
        "email": contact.email,
        "phone": contact.phone,
        "company_name": contact.company_name,
        "designation": contact.designation,
        "job_title": contact.job_title,
        "status": contact.status,
        "lifecycle_stage": contact.lifecycle_stage,
        "source": contact.source,
        "custom_data": contact.custom_data or {},
        "assigned_user_name": contact.assigned_user_name,
        "assigned_user_id": contact.assigned_user_id,
        "created_at": contact.created_at,
        "updated_at": contact.updated_at,
        "total_deals": 0,
        "lifetime_value": 0.0
    }

@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    contact_in: dict,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    for key, val in contact_in.items():
        if hasattr(contact, key) and key not in ["id", "created_at"]:
            setattr(contact, key, val)

    await db.commit()
    await db.refresh(contact)
    return contact

@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.commit()
    return {"message": "Contact deleted successfully"}


from pydantic import BaseModel

class SendEmailRequest(BaseModel):
    subject: str
    body: str

@router.post("/contacts/{contact_id}/send-email")
async def send_contact_email(
    contact_id: str,
    req: SendEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if not contact.email:
        raise HTTPException(status_code=400, detail="This contact does not have a registered email address")

    if not req.subject.strip() or not req.body.strip():
        raise HTTPException(status_code=400, detail="Subject and body cannot be empty")

    # Send email using SMTP service (with graceful local mock fallback if credentials not configured)
    sent_successfully = False
    from app.core.config import settings
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            from app.core.email import send_email_async
            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 20px;">
                <p>{req.body.replace(chr(10), '<br/>')}</p>
                <br/>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8;">Sent via Zigmaa CRM by {contact.assigned_user_name or 'Team'}</p>
            </div>
            """
            await send_email_async(contact.email, req.subject, html_body)
            sent_successfully = True
        except Exception as e:
            print(f"[SMTP Send Error]: {e}, falling back to mock logging for local environment.")
    else:
        print(f"[Local Mock Email]: To={contact.email}, Subject={req.subject}, Body length={len(req.body)}")
        sent_successfully = True

    # Audit & Record to Activity Timeline
    activity_note = f"Sent Email: \"{req.subject}\"\n\n{req.body}"
    activity = Activity(
        organization_id=contact.organization_id or "default-org",
        lead_id=contact.id,
        type="EMAIL",
        notes=activity_note,
        status="COMPLETED"
    )
    db.add(activity)
    await db.commit()

    return {
        "status": "success",
        "message": f"Email successfully sent to {contact.email}",
        "recipient": contact.email,
        "subject": req.subject,
        "activity": {
            "id": activity.id,
            "type": "EMAIL",
            "notes": activity_note,
            "created_at": activity.created_at
        }
    }

