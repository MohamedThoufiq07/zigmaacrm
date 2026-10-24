from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any
import json
import re
import urllib.request
import urllib.error
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.database import get_db
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.task import Task

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class UIContextSchema(BaseModel):
    page: Optional[str] = None
    active_tab: Optional[str] = None
    active_item: Optional[Any] = None
    visible_summary: Optional[Any] = None
    user_role: Optional[str] = None

class ChatRequest(BaseModel):
    question: Optional[str] = None
    message: Optional[str] = None
    history: Optional[List[ChatMessage]] = []
    ui_context: Optional[UIContextSchema] = None

ZIGMAA_CRM_KNOWLEDGE = """
OFFICIAL ZIGMAA CRM FEATURE REFERENCE:
1. Architecture: Modern Full-Stack SaaS built with Next.js Turbopack frontend, FastAPI asynchronous backend, and PostgreSQL persistence with Redis.
2. Contacts (/contacts): Single source of truth for all inbound enquiries and verified customers.
   - Top filter tabs: All Contacts, My Contacts, New Leads, Today's Leads, Customers.
   - Features: Table view, avatar fallback, inline click-to-call, WhatsApp click-to-chat, company, lifecycle stage dropdown (New, Contacted, Interested, Qualified, Customer), assigned owner, and Twozo-style slide-over profile drawer with Zigmaa AI Win Predictor and interaction timeline notes.
3. Deals (/pipeline & /deals): Drag-and-drop Kanban pipeline and table list.
   - 6 Stages: New Deal, Discovery, Proposal Sent, Negotiation, Won, Lost.
   - Stage sums (₹), probability percentages, and quick deal creation.
4. Converting a Lead:
   - Go to Contacts (/contacts).
   - Find the contact or filter by "New Leads".
   - You can update their lifecycle stage to "Qualified" or "Customer", or open Deals (/deals) to create a high-value deal linked to their company.
5. Workflow Automations (/automations):
   - Twozo & Pixelize-style Workflow Automation Engine.
   - Triggers: CONTACT_CREATED, STAGE_CHANGED, TASK_OVERDUE.
   - Actions: Instant Meta Ads WhatsApp Welcome message, Round-Robin sales rep distribution, and automatic follow-up tasks with audit execution logs.
6. Activities:
   - Calendar & Meetings (/events): Schedule calls, meetings, Google Calendar sync integration, and .ics calendar exports.
   - Tasks (/tasks): Manage sales tasks with priority (High, Medium, Low), statuses (To Do, In Progress, Completed), drag-and-drop Kanban.
7. Custom Fields: Dynamically add custom attributes to Contacts and Deals.
8. AI Lead Intelligence & Win Predictor: Real-time win probability percentage, intent tier, and actionable conversion tips.
9. Invoices & Expenses: Generate GST invoices and manage expenses under /settings.
"""

@router.post("/ai/copilot")
async def ai_copilot_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    question = (req.message or req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question or message cannot be empty")

    gemini_api_key = settings.GEMINI_API_KEY
    q_lower = question.lower().strip()
    clean_q = re.sub(r"[^\w\s]", "", q_lower).strip()

    # Instant, calibrated response for pure greetings & pleasantries
    # Prevents unnecessary CRM pitching, screen recitation, or wordy "bla bla"
    pure_greetings = {
        "hi": "Hi there! How can I help you today?",
        "hello": "Hello! How can I assist you with Zigmaa CRM today?",
        "hey": "Hey! How can I help you today?",
        "hi there": "Hi there! How can I help you today?",
        "hello there": "Hello! How can I assist you today?",
        "good morning": "Good morning! How can I assist you today?",
        "good afternoon": "Good afternoon! How can I assist you today?",
        "good evening": "Good evening! How can I assist you today?",
        "thanks": "You're very welcome! Let me know if you need any other help.",
        "thank you": "You're very welcome! Let me know if you need any other help.",
        "who are you": "I am your Zigmaa AI Copilot, your assistant for managing leads, deals, pipelines, and workflows."
    }

    # Check for "how are you" variants (e.g. "hi how are you", "how are you", "hey how r u")
    is_how_are_you = any(p in clean_q for p in [
        "how are you", "how are you doing", "how r u", "hows it going", "how is it going"
    ]) and len(clean_q.split()) <= 6

    if is_how_are_you:
        return {
            "answer": "Hello! I'm doing great, thank you. How can I help you today?",
            "engine": "Zigmaa Assistant",
            "model_used": "direct-assistant",
            "status": "success",
            "ui_context_received": bool(req.ui_context)
        }

    if clean_q in pure_greetings:
        return {
            "answer": pure_greetings[clean_q],
            "engine": "Zigmaa Assistant",
            "model_used": "direct-assistant",
            "status": "success",
            "ui_context_received": bool(req.ui_context)
        }

    # Fetch live CRM database metrics for contextual intelligence
    total_contacts = 0
    stage_breakdown = {}
    total_deals = 0
    total_deal_value = 0.0

    try:
        contact_count_res = await db.execute(select(func.count(Contact.id)))
        total_contacts = contact_count_res.scalar() or 0

        stage_counts_res = await db.execute(
            select(Contact.lifecycle_stage, func.count(Contact.id)).group_by(Contact.lifecycle_stage)
        )
        stage_breakdown = {stage or "New": count for stage, count in stage_counts_res.fetchall()}

        deal_stats_res = await db.execute(
            select(func.count(Deal.id), func.coalesce(func.sum(Deal.deal_value), 0))
        )
        deal_stats = deal_stats_res.first()
        if deal_stats:
            total_deals = deal_stats[0] or 0
            total_deal_value = float(deal_stats[1] or 0.0)
    except Exception as db_err:
        logger.warning(f"Could not load live DB stats for Copilot context: {db_err}")

    # Build conversation history for context
    history_context = ""
    if req.history:
        for m in req.history[-6:]:
            role_name = "User" if m.role == "user" else "Assistant"
            history_context += f"\n{role_name}: {m.content}"

    # Ingest Active UI Context
    ui_ctx = req.ui_context
    active_page = ui_ctx.page if ui_ctx and ui_ctx.page else "/contacts"
    active_tab = ui_ctx.active_tab if ui_ctx and ui_ctx.active_tab else "All Contacts"
    active_item = ui_ctx.active_item if ui_ctx else None
    visible_summary = ui_ctx.visible_summary if ui_ctx else None
    user_role = ui_ctx.user_role if ui_ctx and ui_ctx.user_role else "ADMIN"

    ui_context_text = (
        "USER REAL-TIME SCREEN & UI CONTEXT (FOR YOUR SILENT ANALYSIS):\n"
        f"- Current Screen/Route: {active_page}\n"
        f"- Active Tab / Filter: {active_tab}\n"
        f"- Currently Open Drawer Item: {json.dumps(active_item, ensure_ascii=False) if active_item else 'None'}\n"
        f"- Visible UI Content / Records Summary: {json.dumps(visible_summary, ensure_ascii=False) if visible_summary else 'Default list view'}\n"
        f"- User Role: {user_role}\n"
    )

    crm_stats_context = (
        "LIVE CRM DATABASE METRICS:\n"
        f"- Total Contacts in CRM: {total_contacts}\n"
        f"- Lifecycle Stage Distribution: {stage_breakdown}\n"
        f"- Total Active Deals: {total_deals}\n"
        f"- Total Active Pipeline Value: ₹{total_deal_value:,.2f}\n"
    )

    system_instruction = (
        "You are Zigmaa AI Copilot, an intelligent, professional, and natural CRM assistant.\n\n"
        "STRICT COMMUNICATION RULES (MANDATORY):\n"
        "1. NEVER ANNOUNCE OR RECITE WHAT SECTION OR SCREEN THE USER IS ON:\n"
        "   - NEVER start or format replies with boilerplate like:\n"
        "     ❌ 'Looking at your current Overview screen...'\n"
        "     ❌ 'Observing your active screen on /...'\n"
        "     ❌ 'Looking at your current Contacts view with 42 records...'\n"
        "     ❌ 'Since you are on the Deals Kanban board...'\n"
        "   - The user is already looking at their screen. NEVER state their section, route path, or record count unless they explicitly asked for it.\n"
        "2. DO NOT MENTION RECORD COUNTS OR DATABASE TOTALS UNPROMPTED:\n"
        "   - NEVER bring up numbers like '42 records', '15 deals', etc., unless the user specifically asked a question about counts or stats.\n"
        "3. DO NOT OVER-REPLY OR ADD UNNECESSARY FILLER ('NO BLA BLA'):\n"
        "   - Answer ONLY what the user asked with appropriate depth and proportion.\n"
        "   - Do NOT dump unsolicited paragraphs of sales pitch, feature lists, or random suggestions without being asked.\n"
        "   - Keep casual or quick inquiries crisp and direct.\n"
        "4. ANALYZE ALL UI CONTENT CHANGES SILENTLY AND RESPOND RESPECTIVELY:\n"
        "   - Use the real-time UI context below to understand what the user is currently viewing.\n"
        "   - If a drawer is open and the user asks 'help me with this client' or 'what should I do next?', immediately address that specific client/deal by name and stage, and provide practical next steps.\n"
        "   - If the user asks about records, metrics, or table data on screen, explain the relevant information clearly and respectively.\n"
        "5. READ-ONLY ADVISOR:\n"
        "   - Guide the user on what actions to take in the UI (e.g. click Call or WhatsApp, advance lifecycle stage, create a deal). You cannot directly modify database records.\n\n"
        f"{ui_context_text}\n"
        f"{crm_stats_context}\n"
        f"{ZIGMAA_CRM_KNOWLEDGE}"
    )

    full_prompt = (
        f"{system_instruction}\n\n"
        f"CONVERSATION HISTORY:{history_context}\n\n"
        f"USER: {question}\n\n"
        f"ZIGMAA AI COPILOT:"
    )

    # Models supported by Google Gemini API
    gemini_models = ["gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-2.5-flash"]
    last_err = None

    if gemini_api_key:
        for g_model in gemini_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_api_key}"
                req_data = {
                    "contents": [{
                        "parts": [{"text": full_prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 800
                    }
                }
                req_obj = urllib.request.Request(
                    url,
                    data=json.dumps(req_data).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req_obj, timeout=12) as response:
                    raw_res = json.loads(response.read().decode("utf-8"))
                    candidates = raw_res.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            answer = parts[0]["text"].strip()
                            return {
                                "answer": answer,
                                "engine": f"Google Gemini ({g_model})",
                                "model_used": g_model,
                                "status": "success",
                                "ui_context_received": bool(req.ui_context)
                            }
            except Exception as e:
                last_err = e
                logger.warning(f"Copilot call to {g_model} failed: {e}")

    # Fallback contextual responses if Gemini is temporarily unreachable
    # Active drawer contextual fallback
    if active_item and any(k in q_lower for k in ["this client", "this lead", "this contact", "this deal", "help me with", "what next"]):
        item_name = active_item.get("name") or active_item.get("title") or "this client"
        item_stage = active_item.get("stage") or "New"
        return {
            "answer": (
                f"Recommended next steps for **{item_name}** (Stage: **{item_stage}**):\n\n"
                f"1. **Direct Outreach**: Reach out via the **Call** or **WhatsApp** quick action buttons.\n"
                f"2. **Advance Stage**: Once in touch, update their stage to **Interested** or **Qualified**.\n"
                f"3. **Follow-up / Deal**: Add an activity note or click **+ Deal** to move them into your pipeline."
            ),
            "engine": "Zigmaa Contextual Advisor",
            "model_used": "direct-contextual",
            "status": "success",
            "ui_context_received": True
        }

    # /contacts focus fallback
    if active_page.startswith("/contacts") and any(k in q_lower for k in ["focus", "prioritize", "start", "what to do"]):
        new_count = stage_breakdown.get('New', 0) + stage_breakdown.get('NEW', 0)
        return {
            "answer": (
                f"Here are key priorities to focus on:\n\n"
                f"• **Priority 1**: Reach out to **New Leads** ({new_count} leads waiting) via Call or WhatsApp.\n"
                f"• **Priority 2**: Check pending inquiries under **Untouched Enquiries**.\n"
                f"• **Priority 3**: Advance qualified contacts by clicking **+ Deal** to add them to your pipeline."
            ),
            "engine": "Zigmaa Contextual Advisor",
            "model_used": "direct-contextual",
            "status": "success",
            "ui_context_received": True
        }

    if any(k in q_lower for k in ["how many contact", "count contact", "number of contact", "total contact"]):
        breakdown_str = ", ".join([f"{count} {stage}" for stage, count in stage_breakdown.items()])
        answer = f"You have **{total_contacts} contacts** in your CRM"
        if breakdown_str:
            answer += f" ({breakdown_str})."
        else:
            answer += "."
        return {
            "answer": answer,
            "engine": "Zigmaa CRM Intelligence Engine",
            "model_used": "direct-database",
            "status": "success",
            "ui_context_received": bool(req.ui_context)
        }

    if any(k in q_lower for k in ["how many deal", "total deal", "pipeline value", "total value"]):
        return {
            "answer": f"You have **{total_deals} active deals** in your pipeline with a total value of **₹{total_deal_value:,.2f}**.",
            "engine": "Zigmaa CRM Intelligence Engine",
            "model_used": "direct-database",
            "status": "success",
            "ui_context_received": bool(req.ui_context)
        }

    # Default fallback
    return {
        "answer": "How can I help you today? Feel free to ask about your leads, deals pipeline, automations, tasks, or any feature in Zigmaa CRM.",
        "engine": "Zigmaa Contextual Advisor",
        "model_used": "fallback",
        "status": "success",
        "ui_context_received": bool(req.ui_context)
    }
