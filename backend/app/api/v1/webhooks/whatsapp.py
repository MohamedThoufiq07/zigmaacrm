import re
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.contact import Contact
from app.models.organization_user import Organization
from app.models.whatsapp import WhatsAppMessage
from app.models.activity import Activity

router = APIRouter()

def normalize_phone(phone: str) -> str:
    """Normalize phone number by stripping pluses, spaces, dashes."""
    return re.sub(r"[^\d]", "", str(phone or ""))

@router.get("/whatsapp")
@router.get("/webhooks/whatsapp")
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta Cloud API Webhook Verification Handshake
    GET /api/v1/webhooks/whatsapp
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        # Return plain challenge string/int as required by Meta webhook specifications
        return Response(content=str(hub_challenge), media_type="text/plain", status_code=200)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verification token mismatch"
    )

@router.post("/whatsapp")
@router.post("/webhooks/whatsapp")
async def receive_whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Meta Cloud API Inbound Webhook Ingestion
    POST /api/v1/webhooks/whatsapp
    Captures incoming WhatsApp messages, creates or updates contacts, and logs to whatsapp_messages.
    """
    try:
        body: Dict[str, Any] = await request.json()
    except Exception:
        return Response(content='{"status": "invalid_json"}', media_type="application/json", status_code=200)

    # Resolve default organization
    res_org = await db.execute(select(Organization).limit(1))
    default_org = res_org.scalars().first()
    default_org_id = default_org.id if default_org else None

    entries = body.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            field = change.get("field")

            # 1. Handle Status updates (sent, delivered, read)
            statuses = value.get("statuses", [])
            for st in statuses:
                meta_id = st.get("id")
                wa_status = st.get("status", "").upper()  # SENT, DELIVERED, READ, FAILED
                if meta_id and wa_status in ["SENT", "DELIVERED", "READ", "FAILED"]:
                    msg_res = await db.execute(
                        select(WhatsAppMessage).where(WhatsAppMessage.meta_message_id == meta_id)
                    )
                    wa_msg = msg_res.scalar_one_or_none()
                    if wa_msg:
                        wa_msg.status = wa_status
                        await db.commit()

            # 2. Handle Inbound Messages
            messages = value.get("messages", [])
            contacts_meta = value.get("contacts", [])
            profile_name = None
            if contacts_meta and len(contacts_meta) > 0:
                profile_name = contacts_meta[0].get("profile", {}).get("name")

            for msg in messages:
                raw_from = msg.get("from", "")
                clean_phone = normalize_phone(raw_from)
                if not clean_phone:
                    continue

                msg_type = msg.get("type", "text")
                meta_msg_id = msg.get("id")

                # Extract text body based on message type
                text_body = ""
                if msg_type == "text":
                    text_body = msg.get("text", {}).get("body", "")
                elif msg_type == "image":
                    text_body = msg.get("image", {}).get("caption", "[Image Attachment]")
                elif msg_type == "document":
                    text_body = msg.get("document", {}).get("caption", "[Document Attachment]")
                elif msg_type == "button":
                    text_body = msg.get("button", {}).get("text", "[Button Click]")
                elif msg_type == "interactive":
                    text_body = msg.get("interactive", {}).get("button_reply", {}).get("title", "[Interactive Response]")
                else:
                    text_body = f"[{msg_type.capitalize()} Message]"

                # Check if contact exists by phone (matching last 10 digits for Indian & global numbers)
                search_suffix = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
                contact_res = await db.execute(
                    select(Contact).where(Contact.phone.like(f"%{search_suffix}%")).limit(1)
                )
                contact = contact_res.scalar_one_or_none()

                if not contact:
                    # Automatically capture new lead into Contacts table
                    contact_display_name = profile_name or f"WhatsApp Contact (+{clean_phone})"
                    contact = Contact(
                        organization_id=default_org_id,
                        full_name=contact_display_name,
                        phone=f"+{clean_phone}",
                        source="WhatsApp",
                        status="NEW",
                        lifecycle_stage="NEW",
                        custom_data={
                            "whatsapp_profile_name": profile_name,
                            "channel": "meta_whatsapp_cloud_api",
                            "first_message": text_body[:200]
                        },
                        assigned_user_name="Mohamed Thoufiq"
                    )
                    db.add(contact)
                    await db.commit()
                    await db.refresh(contact)

                # Store incoming message into WhatsApp history
                wa_record = WhatsAppMessage(
                    organization_id=contact.organization_id or default_org_id,
                    contact_id=contact.id,
                    phone_number=clean_phone,
                    direction="INBOUND",
                    message_body=text_body or "[No Body]",
                    message_type=msg_type,
                    meta_message_id=meta_msg_id,
                    status="DELIVERED"
                )
                db.add(wa_record)

                # Also log CRM Activity for visibility across Lead Timeline
                activity = Activity(
                    organization_id=contact.organization_id or default_org_id,
                    contact_id=contact.id,
                    type="NOTE",
                    notes=f"💬 WhatsApp Inbound: {text_body[:250]}",
                    status="COMPLETED"
                )
                db.add(activity)
                await db.commit()

    return {"status": "success", "processed": True}
