from sqlalchemy.ext.asyncio import AsyncSession
from app.models.activity import MessageLog
from datetime import datetime

class NotificationService:
    @staticmethod
    async def send_whatsapp_message(db: AsyncSession, org_id: str, phone: str, body: str):
        msg = MessageLog(
            organization_id=org_id,
            recipient_phone=phone,
            channel="WHATSAPP",
            direction="OUTBOUND",
            body=body,
            status="DELIVERED",
            sent_at=datetime.utcnow()
        )
        db.add(msg)
        await db.commit()
        return msg
