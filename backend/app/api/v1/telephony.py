import os
import urllib.request
import urllib.parse
import json
import base64
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.organization_setting import OrganizationSetting
from app.models.activity import Activity
from app.api.deps import get_current_user

router = APIRouter(prefix="/telephony", tags=["Telephony"])


class TelephonySettingsSchema(BaseModel):
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_caller_id: Optional[str] = None
    twilio_twiml_app_sid: Optional[str] = None


class CallInitiateSchema(BaseModel):
    to_phone: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    custom_message: Optional[str] = None


def format_e164(phone: str) -> str:
    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    if not cleaned:
        return ""
    if cleaned.startswith("+"):
        return cleaned
    # Common standard: 10 digits in India
    if len(cleaned) == 10:
        return f"+91{cleaned}"
    if len(cleaned) == 11 and cleaned.startswith("0"):
        return f"+91{cleaned[1:]}"
    return f"+{cleaned}"


@router.get("/settings")
async def get_telephony_settings(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Retrieve current Twilio Telephony configuration (with masked token)."""
    res = await db.execute(select(OrganizationSetting).order_by(OrganizationSetting.created_at.desc()).limit(1))
    org_settings = res.scalars().first()

    sid = (org_settings.twilio_account_sid if org_settings else None) or os.getenv("TWILIO_ACCOUNT_SID", "")
    token = (org_settings.twilio_auth_token if org_settings else None) or os.getenv("TWILIO_AUTH_TOKEN", "")
    caller_id = (org_settings.twilio_caller_id if org_settings else None) or os.getenv("TWILIO_CALLER_ID", "")
    app_sid = (org_settings.twilio_twiml_app_sid if org_settings else None) or os.getenv("TWILIO_TWIML_APP_SID", "")

    masked_token = (token[:4] + "••••••••" + token[-4:]) if token and len(token) > 8 else ("••••••••" if token else "")

    return {
        "is_configured": bool(sid and token and caller_id),
        "twilio_account_sid": sid,
        "twilio_caller_id": caller_id,
        "twilio_twiml_app_sid": app_sid,
        "has_auth_token": bool(token),
        "masked_auth_token": masked_token,
        "provider": "TWILIO"
    }


@router.post("/settings")
async def save_telephony_settings(
    data: TelephonySettingsSchema,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Save or update Twilio API credentials."""
    res = await db.execute(select(OrganizationSetting).order_by(OrganizationSetting.created_at.desc()).limit(1))
    org_settings = res.scalars().first()

    if not org_settings:
        org_settings = OrganizationSetting()
        db.add(org_settings)

    if data.twilio_account_sid is not None:
        org_settings.twilio_account_sid = data.twilio_account_sid.strip()
    if data.twilio_auth_token is not None and data.twilio_auth_token.strip() and not data.twilio_auth_token.startswith("••"):
        org_settings.twilio_auth_token = data.twilio_auth_token.strip()
    if data.twilio_caller_id is not None:
        org_settings.twilio_caller_id = data.twilio_caller_id.strip()
    if data.twilio_twiml_app_sid is not None:
        org_settings.twilio_twiml_app_sid = data.twilio_twiml_app_sid.strip()

    await db.commit()
    await db.refresh(org_settings)

    return {
        "message": "Telephony settings successfully updated.",
        "is_configured": bool(org_settings.twilio_account_sid and org_settings.twilio_auth_token and org_settings.twilio_caller_id)
    }


@router.post("/call")
async def make_real_call(
    payload: CallInitiateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Places an actual outbound telephone call to a real mobile/landline phone
    using Twilio's Telecom Gateway.
    """
    res = await db.execute(select(OrganizationSetting).order_by(OrganizationSetting.created_at.desc()).limit(1))
    org_settings = res.scalars().first()

    account_sid = (org_settings.twilio_account_sid if org_settings else None) or os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = (org_settings.twilio_auth_token if org_settings else None) or os.getenv("TWILIO_AUTH_TOKEN")
    caller_id = (org_settings.twilio_caller_id if org_settings else None) or os.getenv("TWILIO_CALLER_ID")

    if not account_sid or not auth_token or not caller_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Twilio Voice credentials are not configured. "
                "Please configure your Twilio Account SID, Auth Token, and Twilio Caller Phone Number "
                "in Settings > Voice & Telephony to place real telephone calls."
            )
        )

    to_number = format_e164(payload.to_phone)
    if not to_number or len(to_number) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid phone number: '{payload.to_phone}'. Please provide a valid 10+ digit mobile number."
        )

    from_number = format_e164(caller_id)

    # Construct TwiML voice response
    greeting = payload.custom_message or (
        f"Hello. This is a call from Zigmaa CRM for {payload.contact_name or 'our valued client'}. "
        "Please hold while we connect you to your sales representative."
    )
    twiml = f"<Response><Say voice='alice'>{greeting}</Say><Pause length='3'/></Response>"

    twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json"
    post_data = urllib.parse.urlencode({
        "To": to_number,
        "From": from_number,
        "Twiml": twiml
    }).encode("utf-8")

    req = urllib.request.Request(twilio_url, data=post_data, method="POST")
    auth_header = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("utf-8")
    req.add_header("Authorization", f"Basic {auth_header}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            resp_body = response.read().decode("utf-8")
            call_data = json.loads(resp_body)
            call_sid = call_data.get("sid", "CALL_" + to_number)
            call_status = call_data.get("status", "queued")

            # Log to Activity history
            if payload.contact_id:
                try:
                    new_activity = Activity(
                        contact_id=str(payload.contact_id),
                        type="CALL",
                        notes=f"Real Outbound Call initiated via Twilio to {to_number}. Status: {call_status}. SID: {call_sid}",
                        status="COMPLETED"
                    )
                    db.add(new_activity)
                    await db.commit()
                except Exception as log_err:
                    print("Activity log error:", log_err)

            return {
                "success": True,
                "call_sid": call_sid,
                "status": call_status,
                "to": to_number,
                "from": from_number,
                "message": f"Real call successfully dispatched to {to_number}. Twilio Call SID: {call_sid}"
            }
    except urllib.error.HTTPError as http_err:
        err_msg = http_err.read().decode("utf-8")
        try:
            err_json = json.loads(err_msg)
            detailed = err_json.get("message", err_msg)
            code = err_json.get("code", "")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Twilio Telephony Error ({code}): {detailed}"
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Twilio API Error ({http_err.code}): {err_msg}"
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to Twilio Voice Gateway: {str(exc)}"
        )
