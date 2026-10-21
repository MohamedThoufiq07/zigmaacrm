import re
import uuid
import logging
import httpx
import datetime
from datetime import datetime as dt_utcnow
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, or_, desc

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.models.contact import Contact
from app.models.lead_pipeline import Lead
from app.models.organization_user import Organization
from app.models.whatsapp import WhatsAppMessage
from app.models.activity import Activity

logger = logging.getLogger("zigmaa.whatsapp")

router = APIRouter()

WELCOME_MESSAGE_BODY = "Hello! 👋 Thank you for reaching out to Zigmaa CRM. We've logged your request and our sales team will connect with you shortly."

def normalize_phone(phone: str) -> str:
    """Normalize phone number by stripping pluses, spaces, dashes."""
    return re.sub(r"[^\d]", "", str(phone or ""))

def format_display_phone(phone: str) -> str:
    """Format phone number for clean human-readable display, e.g., +91 96004 71080."""
    clean = normalize_phone(phone)
    if not clean:
        return "Unknown Prospect"
    if len(clean) == 12 and clean.startswith("91"):
        return f"+91 {clean[2:7]} {clean[7:]}"
    elif len(clean) == 10:
        return f"+91 {clean[:5]} {clean[5:]}"
    return f"+{clean}"

def is_generic_or_placeholder_name(name: Optional[str], phone: str) -> bool:
    """Check if name is empty, random/gibberish, placeholder, or just the phone number."""
    if not name or not name.strip():
        return True
    cleaned = name.strip()
    clean_p = normalize_phone(phone)
    if clean_p and (clean_p in cleaned.replace(" ", "") or cleaned.replace(" ", "").endswith(clean_p[-10:])):
        return True
    lower = cleaned.lower()
    for prefix in [
        "whatsapp lead", "whatsapp contact", "whatsapp user", "new lead",
        "unknown", "lead", "direct prospect", "test lead", "undefined", "null", "none", "prospect", "contact"
    ]:
        if lower == prefix or lower.startswith(prefix + " (") or lower.startswith(prefix + " +") or lower.startswith(prefix + " ") or lower.startswith(prefix + "_"):
            return True
    # UUID, hex or purely numeric strings
    if re.match(r"^[0-9a-fA-F-]{8,}$", cleaned):
        return True
    # Common keyboard mash walks
    for mash in ["asdf", "qwerty", "zxcv", "qwer", "hjkl", "1234", "abcd"]:
        if mash in lower:
            return True
    # 5 or more consecutive consonants (e.g., random keyboard mashing)
    if re.search(r"[bcdfghjklmnpqrstvwxyz]{5,}", lower):
        return True
    return False

async def backfill_whatsapp_contacts(db: AsyncSession) -> int:
    """
    Automated check on existing messages in whatsapp_messages table:
    Find all unique sender numbers that do not yet exist in contacts.
    Dynamically insert each as a contact with source="WhatsApp" and lifecycle_stage="New",
    extracting their name from the conversation if available.
    Commit all updates cleanly.
    """
    res_org = await db.execute(select(Organization).limit(1))
    default_org = res_org.scalars().first()
    default_org_id = default_org.id if default_org else None

    # Find distinct phone numbers from whatsapp_messages
    stmt = select(WhatsAppMessage.phone_number).distinct()
    res = await db.execute(stmt)
    phones = [p for p in res.scalars().all() if p]

    created_count = 0
    for sender_phone in phones:
        clean = normalize_phone(sender_phone)
        if not clean:
            continue
        clean_digits = "".join(filter(str.isdigit, clean))[-10:]
        if not clean_digits:
            continue

        existing_c = await db.execute(
            select(Contact).where(Contact.phone.ilike(f"%{clean_digits}%")).limit(1)
        )
        contact = existing_c.scalars().first()

        if not contact:
            # Check if there is an existing Lead to extract the name
            lead_res = await db.execute(
                select(Lead).where(Lead.phone.ilike(f"%{clean_digits}%")).limit(1)
            )
            existing_lead = lead_res.scalars().first()
            if existing_lead and existing_lead.full_name and not is_generic_or_placeholder_name(existing_lead.full_name, clean):
                contact_display_name = existing_lead.full_name
            else:
                contact_display_name = f"WhatsApp Lead (+{clean})"

            new_contact = Contact(
                organization_id=default_org_id,
                full_name=contact_display_name,
                phone=f"+{sender_phone.lstrip('+')}",
                email=None,
                company_name=None,
                source="WhatsApp",
                status="NEW",
                lifecycle_stage="New",
                assigned_user_name="Mohamed Thoufiq",
                created_at=dt_utcnow.utcnow()
            )
            db.add(new_contact)
            await db.commit()
            await db.refresh(new_contact)
            created_count += 1

            # Update existing messages for this phone to link to the new contact
            await db.execute(
                update(WhatsAppMessage)
                .where(
                    WhatsAppMessage.phone_number == sender_phone,
                    WhatsAppMessage.contact_id.is_(None)
                )
                .values(contact_id=new_contact.id)
            )
            await db.commit()

    return created_count

async def send_welcome_auto_reply(
    phone_number: str,
    contact_id: Optional[str],
    org_id: Optional[str],
    lead_id: Optional[str] = None
):
    """
    Sends an automated welcome reply via Meta Cloud API and stores in database.
    Runs asynchronously in FastAPI background tasks to ensure immediate webhook response.
    """
    clean_phone = normalize_phone(phone_number)
    meta_message_id = None
    delivery_status = "SENT"

    # 1. Dispatch to Meta Cloud API if credentials exist
    api_token = settings.WHATSAPP_ACCESS_TOKEN or settings.WHATSAPP_API_TOKEN
    phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID

    if api_token and phone_number_id:
        url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": WELCOME_MESSAGE_BODY
            }
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                try:
                    data = res.json()
                except Exception:
                    data = {}

                if res.status_code in [200, 201] and "messages" in data:
                    meta_message_id = data["messages"][0].get("id")
                    delivery_status = "SENT"
                    logger.info(f"[AUTO-REPLY SUCCESS] Meta message {meta_message_id} dispatched to {clean_phone}")
                else:
                    delivery_status = "FAILED"
                    meta_message_id = f"wamid.mock_{uuid.uuid4().hex[:18]}"
                    err_msg = data.get("error", {}).get("message") or res.text
                    logger.error(f"[AUTO-REPLY META API ERROR] Status {res.status_code}: {err_msg} | Recipient: {clean_phone}")
                    print(f"[AUTO-REPLY META API ERROR] Status {res.status_code}: {err_msg} | Recipient: {clean_phone}")
        except Exception as e:
            delivery_status = "FAILED"
            meta_message_id = f"wamid.sim_{uuid.uuid4().hex[:18]}"
            logger.error(f"[AUTO-REPLY EXCEPTION] Error calling Meta Cloud API: {e}")
            print(f"[AUTO-REPLY EXCEPTION] Error calling Meta Cloud API: {e}")
    else:
        # Development / Sandbox mode without live Meta token configured
        meta_message_id = f"wamid.dev_welcome_{uuid.uuid4().hex[:18]}"
        delivery_status = "SENT"

    # 2. Persist outbound message in database using isolated AsyncSession
    try:
        async with AsyncSessionLocal() as session:
            outbound_msg = WhatsAppMessage(
                organization_id=org_id,
                contact_id=contact_id,
                phone_number=clean_phone,
                direction="OUTBOUND",
                message_body=WELCOME_MESSAGE_BODY,
                message_type="text",
                meta_message_id=meta_message_id,
                status=delivery_status
            )
            session.add(outbound_msg)

            activity = Activity(
                organization_id=org_id,
                contact_id=contact_id,
                lead_id=lead_id,
                type="NOTE",
                notes=f"💬 WhatsApp Auto-Reply: {WELCOME_MESSAGE_BODY}",
                status="COMPLETED"
            )
            session.add(activity)

            await session.commit()
            logger.info(f"[AUTO-REPLY] Welcome message sent to {clean_phone}")
            print(f"[AUTO-REPLY] Welcome message sent to {clean_phone}")
    except Exception as e:
        logger.error(f"[AUTO-REPLY] Database persistence failed for {clean_phone}: {e}")

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
async def receive_whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Meta Cloud API Inbound Webhook Ingestion
    POST /api/v1/webhooks/whatsapp
    Captures incoming WhatsApp messages, creates or updates leads and contacts, and triggers welcome auto-reply.
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
            contacts_payload = value.get("contacts", [])

            for message in messages:
                # 1. Dynamic Payload Extraction
                sender_phone = str(message.get("from", "")).strip()
                clean_phone = normalize_phone(sender_phone)
                if not clean_phone:
                    continue

                profile_name = None
                if contacts_payload and isinstance(contacts_payload, list):
                    for cm in contacts_payload:
                        if cm.get("wa_id") and normalize_phone(cm.get("wa_id")) == clean_phone:
                            profile_name = cm.get("profile", {}).get("name")
                            break
                    if not profile_name and len(contacts_payload) > 0:
                        profile_name = contacts_payload[0].get("profile", {}).get("name")

                clean_profile_name = profile_name.strip() if (profile_name and str(profile_name).strip()) else None
                contact_display_name = clean_profile_name if clean_profile_name else f"WhatsApp Lead (+{sender_phone})"

                # 2. Dynamic Deduplication & Immediate Persistence
                clean_digits = "".join(filter(str.isdigit, sender_phone))[-10:]

                # Deduplicate and persist Contact
                existing_contact = await db.execute(
                    select(Contact).where(Contact.phone.ilike(f"%{clean_digits}%"))
                )
                contact = existing_contact.scalars().first()

                if not contact:
                    new_contact = Contact(
                        organization_id=default_org_id,
                        full_name=contact_display_name,
                        phone=f"+{sender_phone.lstrip('+')}",
                        email=None,
                        company_name=None,
                        source="WhatsApp",
                        status="NEW",
                        lifecycle_stage="New",
                        custom_data={
                            "whatsapp_profile_name": clean_profile_name,
                            "channel": "meta_whatsapp_cloud_api"
                        },
                        assigned_user_name="Mohamed Thoufiq",
                        created_at=dt_utcnow.utcnow()
                    )
                    db.add(new_contact)
                    await db.commit()
                    await db.refresh(new_contact)
                    contact = new_contact
                    logger.info(f"[CONTACT CREATED] Dynamically captured contact: {contact.full_name} ({contact.phone})")
                elif clean_profile_name and is_generic_or_placeholder_name(contact.full_name, clean_phone):
                    contact.full_name = clean_profile_name
                    contact.custom_data = {**(contact.custom_data or {}), "whatsapp_profile_name": clean_profile_name}
                    await db.commit()
                    await db.refresh(contact)
                    logger.info(f"[CONTACT UPDATED] Updated contact name to profile name: {contact.full_name}")

                # Deduplicate and persist Lead
                existing_lead = await db.execute(
                    select(Lead).where(Lead.phone.ilike(f"%{clean_digits}%"))
                )
                lead = existing_lead.scalars().first()

                if not lead:
                    new_lead = Lead(
                        organization_id=default_org_id,
                        full_name=contact_display_name,
                        phone=f"+{sender_phone.lstrip('+')}",
                        email=None,
                        company_name=None,
                        source="WhatsApp",
                        status="NEW",
                        notes=f"Inbound WhatsApp lead captured dynamically via webhook.",
                        custom_data={
                            "whatsapp_profile_name": clean_profile_name,
                            "channel": "whatsapp_cloud_api"
                        },
                        created_at=dt_utcnow.utcnow()
                    )
                    db.add(new_lead)
                    await db.commit()
                    await db.refresh(new_lead)
                    lead = new_lead
                    logger.info(f"[LEAD CREATED] Dynamically created lead: {lead.full_name} ({lead.phone})")
                elif clean_profile_name and is_generic_or_placeholder_name(lead.full_name, clean_phone):
                    lead.full_name = clean_profile_name
                    lead.custom_data = {**(lead.custom_data or {}), "whatsapp_profile_name": clean_profile_name}
                    await db.commit()
                    await db.refresh(lead)

                # Extract text body based on message type
                msg_type = message.get("type", "text")
                meta_msg_id = message.get("id")
                text_body = ""
                if msg_type == "text":
                    text_body = message.get("text", {}).get("body", "")
                elif msg_type == "image":
                    text_body = message.get("image", {}).get("caption", "[Image Attachment]")
                elif msg_type == "document":
                    text_body = message.get("document", {}).get("caption", "[Document Attachment]")
                elif msg_type == "button":
                    text_body = message.get("button", {}).get("text", "[Button Click]")
                elif msg_type == "interactive":
                    text_body = message.get("interactive", {}).get("button_reply", {}).get("title", "[Interactive Response]")
                else:
                    text_body = f"[{msg_type.capitalize()} Message]"

                # Auto-detect and extract email address from message text if customer shared their email
                if text_body:
                    email_matches = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text_body)
                    if email_matches:
                        detected_email = email_matches[0].lower().strip()
                        if contact and (not contact.email or "@" not in str(contact.email)):
                            contact.email = detected_email
                            logger.info(f"[EMAIL AUTO-CAPTURED] Updated contact {contact.full_name} email to {detected_email}")
                        if lead and (not lead.email or "@" not in str(lead.email)):
                            lead.email = detected_email
                            logger.info(f"[EMAIL AUTO-CAPTURED] Updated lead {lead.full_name} email to {detected_email}")

                # Check prior message history for first inbound trigger
                prior_msg_res = await db.execute(
                    select(WhatsAppMessage).where(WhatsAppMessage.phone_number == clean_phone).limit(1)
                )
                is_first_inbound = prior_msg_res.scalar_one_or_none() is None

                # 3. Store incoming message into WhatsApp history
                wa_record = WhatsAppMessage(
                    organization_id=contact.organization_id or default_org_id,
                    contact_id=contact.id if contact else None,
                    phone_number=clean_phone,
                    direction="INBOUND",
                    message_body=text_body or "[No Body]",
                    message_type=msg_type,
                    meta_message_id=meta_msg_id,
                    status="DELIVERED"
                )
                db.add(wa_record)

                # 4. Log CRM Activity for visibility across Lead Timeline
                activity = Activity(
                    organization_id=contact.organization_id or default_org_id,
                    contact_id=contact.id if contact else None,
                    lead_id=lead.id if lead else None,
                    type="NOTE",
                    notes=f"💬 WhatsApp Inbound: {text_body[:250]}",
                    status="COMPLETED"
                )
                db.add(activity)
                await db.commit()

                # 5. Instant Welcome Auto-Reply (First Inbound Only)
                if is_first_inbound:
                    background_tasks.add_task(
                        send_welcome_auto_reply,
                        clean_phone,
                        contact.id if contact else None,
                        default_org_id,
                        lead.id if lead else None
                    )

    return {"status": "success", "processed": True}
