import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class AIInsightsService:
    @staticmethod
    def _heuristic_win_prediction(contact: Dict[str, Any], notes: List[str], deals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Intelligent fallback heuristic calculation when no external LLM API key is present.
        Evaluates stage progression, notes count, deal existence, and contact profile.
        """
        stage = (contact.get("lifecycle_stage") or contact.get("status") or "New").upper()
        
        # Base win probability by lifecycle stage
        stage_scores = {
            "CUSTOMER": 95,
            "WON": 95,
            "QUALIFIED": 75,
            "INTERESTED": 55,
            "CONTACTED": 40,
            "NEW": 25,
            "LEAD": 25,
            "ACTIVE": 50
        }
        score = stage_scores.get(stage, 35)

        # Activity & engagement boost
        note_count = len(notes)
        if note_count >= 3:
            score += 15
        elif note_count >= 1:
            score += 8

        # Deal attached boost
        if len(deals) > 0:
            score += 10
            for d in deals:
                if "won" in (d.get("status") or "").lower():
                    score = 95
                    break

        # Cap between 10 and 95
        win_percentage = max(10, min(95, score))

        if win_percentage >= 70:
            intent_tier = "High"
            key_insight = "High engagement with clear decision-making signs and advanced lifecycle stage."
            conversion_tips = [
                "Schedule a final commitment call with executive stakeholders",
                "Share customer case studies and fast onboarding SLA timeline"
            ]
            risk_warning = "Delaying proposal or contract delivery may open doors to competitors."
        elif win_percentage >= 40:
            intent_tier = "Medium"
            key_insight = "Active prospect displaying interest; requires deeper qualification and objection handling."
            conversion_tips = [
                "Clarify specific pain points and budget timeframe in next touchpoint",
                "Send targeted product demo video or tailored feature comparison"
            ]
            risk_warning = "Lack of timely follow-up within 48 hours could lead to lead decay."
        else:
            intent_tier = "Low"
            key_insight = "Early-stage or unverified prospect; nurture relationship before hard pitching."
            conversion_tips = [
                "Establish initial rapport via warm WhatsApp message or discovery call",
                "Verify company size, budget constraints, and current tooling"
            ]
            risk_warning = "Unconfirmed contact details or unclear decision maker authority."

        return {
            "win_percentage": win_percentage,
            "intent_tier": intent_tier,
            "key_insight": key_insight,
            "conversion_tips": conversion_tips,
            "risk_warning": risk_warning,
            "engine": "Heuristic Intelligence Engine"
        }

    @classmethod
    async def analyze_prospect(cls, contact: Dict[str, Any], notes: List[str], deals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Invokes Google Gemini 1.5 Flash or Groq Llama-3 if configured, or falls back to heuristic engine.
        """
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        groq_api_key = os.getenv("GROQ_API_KEY")

        prompt_context = f"""
You are a B2B/B2C Sales Intelligence AI. Analyze this prospect's context and return strict JSON:
{{
  "win_percentage": integer (0-100),
  "intent_tier": "High" | "Medium" | "Low",
  "key_insight": "short 1-line analysis",
  "conversion_tips": ["actionable tip 1", "actionable tip 2"],
  "risk_warning": "potential roadblock"
}}

PROSPECT CONTEXT:
- Name: {contact.get('full_name') or contact.get('name')}
- Company: {contact.get('company_name') or 'Not specified'}
- Job Title: {contact.get('job_title') or 'Not specified'}
- Lifecycle Stage: {contact.get('lifecycle_stage') or contact.get('status') or 'New'}
- Source: {contact.get('source') or 'Manual'}
- Custom Data: {json.dumps(contact.get('custom_data') or {})}
- Number of Linked Deals: {len(deals)}
- Deal Details: {json.dumps([{'title': d.get('title'), 'value': d.get('deal_value') or d.get('value'), 'status': d.get('status')} for d in deals])}
- Interaction & Meeting Notes: {json.dumps(notes)}

Return ONLY valid JSON with keys: win_percentage, intent_tier, key_insight, conversion_tips, risk_warning. Do not include markdown codeblocks or extra text.
"""

        # 1. Try Gemini Flash if key provided
        if gemini_api_key:
            gemini_models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-1.5-flash"]
            for g_model in gemini_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_api_key}"
                    req_data = {
                        "contents": [{
                            "parts": [{"text": prompt_context}]
                        }],
                        "generationConfig": {
                            "temperature": 0.2,
                            "response_mime_type": "application/json"
                        }
                    }
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(req_data).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=10) as response:
                        raw_res = json.loads(response.read().decode("utf-8"))
                        text = raw_res["candidates"][0]["content"]["parts"][0]["text"]
                        cleaned = text.strip().replace("```json", "").replace("```", "").strip()
                        parsed = json.loads(cleaned)
                        parsed["engine"] = f"Google Gemini ({g_model})"
                        return parsed
                except Exception as e:
                    logger.debug(f"Gemini {g_model} attempt failed: {e}")

        # 2. Try Groq Llama-3 if key provided
        if groq_api_key:
            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                req_data = {
                    "model": "llama3-8b-8192",
                    "messages": [
                        {"role": "system", "content": "You are a B2B/B2C Sales Intelligence AI. Return strict JSON only."},
                        {"role": "user", "content": prompt_context}
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"}
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(req_data).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {groq_api_key}"
                    }
                )
                with urllib.request.urlopen(req, timeout=8) as response:
                    raw_res = json.loads(response.read().decode("utf-8"))
                    text = raw_res["choices"][0]["message"]["content"]
                    cleaned = text.strip().replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(cleaned)
                    parsed["engine"] = "Groq Llama-3"
                    return parsed
            except Exception as e:
                logger.warning(f"Groq API call failed, falling back to heuristic: {e}")

        # 3. Graceful Fallback Heuristic
        return cls._heuristic_win_prediction(contact, notes, deals)
