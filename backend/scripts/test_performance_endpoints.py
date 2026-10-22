import asyncio
import time
import httpx
from app.core.security import create_access_token
from app.core.database import AsyncSessionLocal
from app.models.organization_user import User
from sqlalchemy import select

BASE_URL = "http://127.0.0.1:8000"

async def test_performance():
    # 1. Fetch any active user to generate a valid test token
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).limit(1))
        user = res.scalar_one_or_none()
        user_id = str(user.id) if user else "test-id"
        print(f"Testing with user id: {user_id} ({user.email})")

    token = create_access_token({"sub": user_id, "email": user.email})
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
        # Check health/root
        t0 = time.perf_counter()
        res = await client.get(f"{BASE_URL}/")
        t_root = (time.perf_counter() - t0) * 1000
        print(f"1. Root GET latency: {t_root:.2f}ms (Status: {res.status_code})")

        # Test WhatsApp conversations latency
        t0 = time.perf_counter()
        res = await client.get(f"{BASE_URL}/api/v1/whatsapp/conversations?limit=40")
        t_conv = (time.perf_counter() - t0) * 1000
        data = res.json() if res.status_code == 200 else {}
        conv_count = len(data.get("conversations", []))
        print(f"2. WhatsApp conversations latency: {t_conv:.2f}ms (Status: {res.status_code}, Count: {conv_count})")

        # Test WhatsApp messages for the first conversation if present
        if conv_count > 0:
            first_phone = data["conversations"][0]["phone_number"]
            t0 = time.perf_counter()
            res = await client.get(f"{BASE_URL}/api/v1/whatsapp/messages?phone_number={first_phone}")
            t_msg = (time.perf_counter() - t0) * 1000
            msg_data = res.json() if res.status_code == 200 else {}
            msg_count = len(msg_data.get("messages", []))
            print(f"3. WhatsApp messages for {first_phone} latency: {t_msg:.2f}ms (Status: {res.status_code}, Count: {msg_count})")

        # Test contacts query latency
        t0 = time.perf_counter()
        res = await client.get(f"{BASE_URL}/api/v1/contacts")
        t_contacts = (time.perf_counter() - t0) * 1000
        contacts = res.json() if res.status_code == 200 else []
        print(f"4. Contacts list latency: {t_contacts:.2f}ms (Status: {res.status_code}, Count: {len(contacts)})")

if __name__ == "__main__":
    asyncio.run(test_performance())
