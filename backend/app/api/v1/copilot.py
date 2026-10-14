from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import urllib.request
import urllib.error
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[ChatMessage]] = []

ZIGMAA_CRM_KNOWLEDGE = """
You are Zigmaa AI Copilot, a witty, helpful, and highly knowledgeable sales intelligence assistant embedded directly in Zigmaa CRM.
Answer user queries concisely, provide sales advice, explain CRM features, or analyze CRM pipeline scenarios naturally. Subtly adapt to the user's style.

OFFICIAL ZIGMAA CRM FEATURE REFERENCE:
1. Architecture: Modern Full-Stack SaaS built with Next.js Turbopack frontend, FastAPI asynchronous backend, and PostgreSQL persistence with Redis.
2. Contacts (/contacts): Single source of truth for all inbound enquiries and verified customers.
   - Top filter tabs: All Contacts, New Leads, In Progress, Customers.
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
8. AI Lead Intelligence & Win Predictor: Real-time win probability percentage, intent tier, and actionable conversion tips powered by Google Gemini.
9. Invoices & Expenses: Generate GST invoices and manage expenses under /settings.
"""

@router.post("/ai/copilot")
async def ai_copilot_chat(req: ChatRequest):
    question = req.question.strip() if req.question else ""
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    gemini_api_key = settings.GEMINI_API_KEY
    if not gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API Key missing or invalid. Please check your .env"
        )

    # Build conversation history for context
    history_context = ""
    if req.history:
        for m in req.history[-6:]:
            role_name = "User" if m.role == "user" else "Assistant"
            history_context += f"\n{role_name}: {m.content}"

    system_instruction = (
        f"{ZIGMAA_CRM_KNOWLEDGE}\n\n"
        f"Answer naturally and dynamically. If the user says a greeting (like 'hi' or 'hello'), reply warmly as Zigmaa AI Copilot. "
        f"If the user asks how to do something in Zigmaa CRM, give step-by-step guidance."
    )

    full_prompt = (
        f"{system_instruction}\n\n"
        f"CONVERSATION HISTORY:{history_context}\n\n"
        f"USER: {question}\n\n"
        f"ZIGMAA AI COPILOT:"
    )

    gemini_models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-1.5-flash"]
    last_err = None

    for g_model in gemini_models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_api_key}"
            req_data = {
                "contents": [{
                    "parts": [{"text": full_prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1000
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
                            "status": "success"
                        }
        except Exception as e:
            last_err = e
            logger.warning(f"Copilot call to {g_model} failed: {e}")

    # If all models failed or network error occurred
    logger.error(f"All Gemini models failed: {last_err}")
    raise HTTPException(
        status_code=502,
        detail=f"Gemini API request failed: {str(last_err)}. Please verify your GEMINI_API_KEY and network connection."
    )
