import uuid
import random
import pytest
import httpx

def get_client() -> httpx.Client:
    try:
        r = httpx.get("http://localhost:8000/health", timeout=1.5)
        if r.status_code == 200:
            return httpx.Client(base_url="http://localhost:8000", timeout=10.0)
    except Exception:
        pass
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)

client = get_client()

def test_signup_uniqueness_rules():
    uid = uuid.uuid4().hex[:6]
    email = f"lead_{uid}@uniquecorp.com"
    company = f"Unique Corp {uid}"
    rand_digits = "".join([str(random.randint(0, 9)) for _ in range(9)])
    phone = f"+91 9{rand_digits}"

    # 1. First signup succeeds
    r1 = client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Primary Founder",
        "company_name": company,
        "phone": phone
    })
    assert r1.status_code == 200, r1.text
    assert "access_token" in r1.json()

    # 2. Duplicate email rejected
    r_dup_email = client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "AnotherPassword123!",
        "full_name": "Duplicate User",
        "company_name": f"Other Corp {uid}",
        "phone": "+91 9888800000"
    })
    assert r_dup_email.status_code == 400
    assert "already registered" in r_dup_email.json()["detail"].lower()
    assert "email" in r_dup_email.json()["detail"].lower()

    # 3. Duplicate company name rejected (case-insensitive)
    r_dup_company = client.post("/api/v1/auth/signup", json={
        "email": f"diff_email_{uid}@uniquecorp.com",
        "password": "AnotherPassword123!",
        "full_name": "Duplicate Company User",
        "company_name": company.upper(),
        "phone": "+91 9888800001"
    })
    assert r_dup_company.status_code == 400
    assert "already registered" in r_dup_company.json()["detail"].lower()
    assert "company" in r_dup_company.json()["detail"].lower()

    # 4. Duplicate phone number rejected
    r_dup_phone = client.post("/api/v1/auth/signup", json={
        "email": f"diff_email2_{uid}@uniquecorp.com",
        "password": "AnotherPassword123!",
        "full_name": "Duplicate Phone User",
        "company_name": f"Other Corp 2 {uid}",
        "phone": phone
    })
    assert r_dup_phone.status_code == 400
    assert "already registered" in r_dup_phone.json()["detail"].lower()
    assert "phone" in r_dup_phone.json()["detail"].lower()
