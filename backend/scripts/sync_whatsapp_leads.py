import asyncio
import os
import sys
from datetime import datetime, timezone

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import select, func, or_
from app.core.database import AsyncSessionLocal
from app.models.contact import Contact
from app.models.whatsapp import WhatsAppMessage
from app.models.lead_pipeline import Lead
from app.models.organization_user import Organization


def normalize_phone(phone: str) -> str:
    """Normalize phone number to digits only."""
    return "".join(filter(str.isdigit, str(phone or "")))


async def sync_whatsapp_leads():
    print("=" * 60)
    print("Starting WhatsApp Leads to Contacts In-Place Sync")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        # 1. Total contacts before sync
        count_before_res = await db.execute(select(func.count(Contact.id)))
        total_contacts_before = count_before_res.scalar() or 0
        print(f"[*] Total Contacts BEFORE sync: {total_contacts_before}")

        # 2. Get default organization
        org_res = await db.execute(select(Organization).limit(1))
        default_org = org_res.scalars().first()
        default_org_id = default_org.id if default_org else None
        print(f"[*] Default Organization ID: {default_org_id}")

        # 3. Scan whatsapp_messages for unique sender phone numbers
        wa_msgs_res = await db.execute(select(WhatsAppMessage))
        wa_messages = wa_msgs_res.scalars().all()
        
        unique_sender_phones = set()
        for msg in wa_messages:
            if msg.phone_number:
                unique_sender_phones.add(msg.phone_number.strip())

        print(f"[*] Found {len(wa_messages)} WhatsApp messages across {len(unique_sender_phones)} unique sender phone(s):")
        for p in sorted(unique_sender_phones):
            print(f"    - {p}")

        # 4. Fetch all existing contacts to cross-reference
        contacts_res = await db.execute(select(Contact))
        existing_contacts = contacts_res.scalars().all()

        inserted_count = 0
        updated_count = 0

        for raw_phone in sorted(unique_sender_phones):
            digits = normalize_phone(raw_phone)
            last10 = digits[-10:] if len(digits) >= 10 else digits
            formatted_phone = f"+{digits}" if not raw_phone.startswith("+") else raw_phone

            # Check if contact with this phone already exists
            matched_contact = None
            for c in existing_contacts:
                c_digits = normalize_phone(c.phone)
                if (len(c_digits) >= 10 and c_digits[-10:] == last10) or c.phone == formatted_phone or c.phone == raw_phone:
                    matched_contact = c
                    break

            if matched_contact:
                print(f"[EXISTS] Sender {raw_phone} matched existing contact '{matched_contact.full_name}' ({matched_contact.phone}, source={matched_contact.source})")
                # If contact has non-WhatsApp source, upgrade source to WhatsApp
                if matched_contact.source not in ["WhatsApp", "WhatsApp Inbound"]:
                    matched_contact.source = "WhatsApp"
                    matched_contact.custom_data = {
                        **(matched_contact.custom_data or {}),
                        "synced_from": "whatsapp_messages"
                    }
                    updated_count += 1
                    print(f"[UPDATED] Contact '{matched_contact.full_name}' source updated to 'WhatsApp'")
                continue

            # Contact is missing: attempt to retrieve profile name from Lead table or fallback
            profile_name = None
            if last10:
                lead_res = await db.execute(select(Lead).where(Lead.phone.ilike(f"%{last10}%")).limit(1))
                lead = lead_res.scalars().first()
                if lead and lead.name and not lead.name.startswith("+"):
                    profile_name = lead.name

            display_name = profile_name if profile_name else formatted_phone

            # Insert missing contact directly into contacts table (naive UTC for PostgreSQL TIMESTAMP WITHOUT TIME ZONE)
            now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
            new_contact = Contact(
                organization_id=default_org_id,
                full_name=display_name,
                phone=formatted_phone,
                source="WhatsApp",
                status="NEW",
                lifecycle_stage="New",
                assigned_user_name="Mohamed Thoufiq",
                owner_name="Mohamed Thoufiq",
                custom_data={
                    "channel": "meta_whatsapp_cloud_api",
                    "synced_from": "whatsapp_messages"
                },
                created_at=now_dt
            )
            db.add(new_contact)
            inserted_count += 1
            print(f"[INSERTED] Added new contact: '{display_name}' ({formatted_phone}) with source='WhatsApp', lifecycle_stage='New'")

        # Explicitly commit changes
        await db.commit()

        # 5. Total contacts after sync
        count_after_res = await db.execute(select(func.count(Contact.id)))
        total_contacts_after = count_after_res.scalar() or 0

        # WhatsApp contacts count
        wa_count_res = await db.execute(select(func.count(Contact.id)).where(Contact.source.ilike("%whatsapp%")))
        total_wa_contacts = wa_count_res.scalar() or 0

        print("=" * 60)
        print("SYNC COMPLETED SUCCESSFULLY")
        print(f"[*] Total Contacts BEFORE : {total_contacts_before}")
        print(f"[*] New Contacts Inserted : {inserted_count}")
        print(f"[*] Contacts Updated      : {updated_count}")
        print(f"[*] Total Contacts AFTER  : {total_contacts_after}")
        print(f"[*] WhatsApp Contacts in DB: {total_wa_contacts}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(sync_whatsapp_leads())
