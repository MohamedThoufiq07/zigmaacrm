"""
FastAPI WhatsApp Webhook & Messaging Endpoints
Maps to backend/app/api/v1/endpoints/whatsapp.py
"""
from fastapi import APIRouter
from app.api.v1.webhooks.whatsapp import (
    router as webhook_router,
    receive_whatsapp_webhook,
    verify_whatsapp_webhook,
    backfill_whatsapp_contacts,
    normalize_phone,
    format_display_phone,
    is_generic_or_placeholder_name,
    send_welcome_auto_reply
)
from app.api.v1.whatsapp import (
    router as whatsapp_api_router,
    send_whatsapp_message,
    get_whatsapp_messages,
    get_whatsapp_conversations
)

router = APIRouter()
router.include_router(webhook_router)
router.include_router(whatsapp_api_router)

__all__ = [
    "router",
    "webhook_router",
    "whatsapp_api_router",
    "send_whatsapp_message",
    "get_whatsapp_messages",
    "get_whatsapp_conversations",
    "receive_whatsapp_webhook",
    "verify_whatsapp_webhook",
    "backfill_whatsapp_contacts",
    "normalize_phone",
    "format_display_phone",
    "is_generic_or_placeholder_name",
    "send_welcome_auto_reply"
]
