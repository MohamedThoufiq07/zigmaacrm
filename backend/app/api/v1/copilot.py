from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any
import json
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
        "USER REAL-TIME SCREEN & UI CONTEXT (READ-ONLY):\n"
        f"- Current Screen/Route: {active_page}\n"
        f"- Active Tab / Filter: {active_tab}\n"
        f"- Currently Open Drawer Item: {json.dumps(active_item, ensure_ascii=False) if active_item else 'None (Viewing List / Table)'}\n"
        f"- Visible Records Summary on Screen: {json.dumps(visible_summary, ensure_ascii=False) if visible_summary else f'{total_contacts} total records'}\n"
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
        "You are Zigmaa AI Copilot, a sales advisor. You DO NOT have execution or modification permissions on the CRM database or UI.\n"
        "You have real-time sight into the user's current screen context provided via ui_context.\n"
        "Reference the user's immediate screen naturally (e.g., 'Looking at your current Contacts view with 26 records...', 'Since you have opened the contact drawer for dcvfgb dgfdfdg...', 'Since you are on the Deals Kanban board...').\n"
        "Guide the user on what button to click, which tab to check, or what steps to take next based strictly on what is displayed on their screen.\n\n"
        f"{ui_context_text}\n"
        f"{crm_stats_context}\n"
        f"{ZIGMAA_CRM_KNOWLEDGE}\n\n"
        "STRICT GUIDANCE RULES:\n"
        "1. When on /contacts and user asks 'What should I focus on?', explicitly acknowledge the active Contacts table view and guide them on prioritizing their new leads, contacting unassigned leads, or converting interested contacts.\n"
        "2. When a contact or deal drawer is open (active_item is populated) and user asks 'Help me with this client', immediately address that opened client by name without asking them to retype it, review their stage, and advise actionable next steps (like calling them, adding timeline notes, or creating a quotation).\n"
        "3. You are strictly read-only. Never claim you have deleted or mutated database records."
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
                        "temperature": 0.5,
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
    q_lower = question.lower()

    # Active drawer contextual fallback
    if active_item and any(k in q_lower for k in ["this client", "this lead", "this contact", "help me with", "what next"]):
        item_name = active_item.get("name") or active_item.get("title") or "this client"
        item_stage = active_item.get("stage") or "New"
        return {
            "answer": (
                f"Looking at **{item_name}** currently open in your slide drawer (Stage: **{item_stage}**):\n\n"
                f"1. **Review Contact Info**: Check their phone number and click the **Call** or **WhatsApp** button.\n"
                f"2. **Advance Lifecycle Stage**: Once contacted, use the stage pill bar at the top to move them from **{item_stage}** to **Interested** or **Qualified**.\n"
                f"3. **Create Deal / Quotation**: Click **+ Deal** or open Quotes to send them a customized proposal."
            ),
            "engine": "Zigmaa Contextual Advisor",
            "model_used": "direct-contextual",
            "status": "success",
            "ui_context_received": True
        }

    # /contacts focus fallback
    if active_page.startswith("/contacts") and any(k in q_lower for k in ["focus", "prioritize", "start", "what to do"]):
        return {
            "answer": (
                f"Looking at your current **Contacts** view with **{total_contacts} records** (Active Tab: **{active_tab}**):\n\n"
                f"• **Priority 1**: Filter by **New Leads** ({stage_breakdown.get('New', 0) + stage_breakdown.get('NEW', 0)} leads) and initiate first contact via Call or WhatsApp.\n"
                f"• **Priority 2**: Check any inquiries older than 24 hours under the **Untouched Enquiries** tab.\n"
                f"• **Priority 3**: Click any qualified contact and click **+ Deal** to move them into your active sales pipeline."
            ),
            "engine": "Zigmaa Contextual Advisor",
            "model_used": "direct-contextual",
            "status": "success",
            "ui_context_received": True
        }

    if any(k in q_lower for k in ["how many contact", "count contact", "number of contact", "total contact"]):
        breakdown_str = ", ".join([f"{count} {stage}" for stage, count in stage_breakdown.items()])
        answer = f"You currently have **{total_contacts} contacts** in your Zigmaa CRM"
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

    if any(k in q_lower for k in ["hi", "hello", "hey", "who are you"]):
        return {
            "answer": f"Hello! I am your Zigmaa AI Copilot, observing your active screen on **{active_page}** ({active_tab}). How can I guide your sales workflow today?",
            "engine": "Zigmaa CRM Intelligence Engine",
            "model_used": "direct-assistant",
            "status": "success",
            "ui_context_received": bool(req.ui_context)
        }

    # Default fallback
    return {
        "answer": f"I am observing your current screen on **{active_page}** with {total_contacts} contacts and {total_deals} active deals. How can I assist with your sales workflow?",
        "engine": "Zigmaa Contextual Advisor",
        "model_used": "fallback",
        "status": "success",
        "ui_context_received": bool(req.ui_context)
    }
