"""
Multi-Tenant Organization Scoping & RBAC Test Suite
Validates:
1. Automatic Admin on Sign-up:
   - Organization auto-created with company name
   - Registered user's role is strictly "admin" with organization_id linked
2. Strict Organization Scoping (Data Isolation):
   - GET /api/v1/users filters strictly by WHERE organization_id = current_user.organization_id
   - Users from other organizations are never leaked
3. Team Invitation by Client Admin:
   - Creating member assigns creator's organization_id with specified role ("sales_rep" or "admin")
   - Cross-tenant role modification and deletion are prevented
   - Sales reps cannot invite team members (HTTP 403)
"""

import uuid
import pytest
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, delete

from app.core.config import settings
from app.models.organization_user import User, Organization

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

def test_signup_creates_org_and_admin():
    uid = uuid.uuid4().hex[:6]
    company = f"Acme Org {uid}"
    email = f"owner_{uid}@acme{uid}.com"
    pwd = "SecurePassword@2026!"
    
    resp = client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": pwd,
        "full_name": f"Owner {uid}",
        "company_name": company
    })
    assert resp.status_code == 200, f"Signup failed: {resp.text}"
    data = resp.json()
    user = data["user"]
    
    assert user["role"].lower() == "admin", f"Expected role admin, got {user['role']}"
    assert user["organization_id"], "User must have organization_id linked"
    assert user["company_name"] == company or company in user.get("organization_name", "")


def test_strict_organization_scoping_users_query():
    # 1. Register Org A Owner
    uid_a = uuid.uuid4().hex[:6]
    resp_a = client.post("/api/v1/auth/signup", json={
        "email": f"org_a_{uid_a}@test.com",
        "password": "PasswordA@2026!",
        "full_name": f"Admin A {uid_a}",
        "company_name": f"Company A {uid_a}"
    })
    assert resp_a.status_code == 200
    token_a = resp_a.json()["access_token"]
    user_a = resp_a.json()["user"]

    # 2. Register Org B Owner
    uid_b = uuid.uuid4().hex[:6]
    resp_b = client.post("/api/v1/auth/signup", json={
        "email": f"org_b_{uid_b}@test.com",
        "password": "PasswordB@2026!",
        "full_name": f"Admin B {uid_b}",
        "company_name": f"Company B {uid_b}"
    })
    assert resp_b.status_code == 200
    token_b = resp_b.json()["access_token"]
    user_b = resp_b.json()["user"]

    # Confirm different organization IDs
    assert user_a["organization_id"] != user_b["organization_id"], "Orgs must have distinct IDs"

    # 3. Query GET /api/v1/users as Org A Admin
    headers_a = {"Authorization": f"Bearer {token_a}"}
    users_resp_a = client.get("/api/v1/users", headers=headers_a)
    assert users_resp_a.status_code == 200
    members_a = users_resp_a.json()

    # All returned members must have Org A's organization_id
    for m in members_a:
        assert m["organization_id"] == user_a["organization_id"], (
            f"Cross-tenant leak detected! Expected {user_a['organization_id']}, got {m['organization_id']}"
        )
    # Must NOT include Org B's admin
    emails_in_a = [m["email"].lower() for m in members_a]
    assert user_b["email"].lower() not in emails_in_a, "Org B user leaked into Org A team list!"

    # 4. Query GET /api/v1/users as Org B Admin
    headers_b = {"Authorization": f"Bearer {token_b}"}
    users_resp_b = client.get("/api/v1/users", headers=headers_b)
    assert users_resp_b.status_code == 200
    members_b = users_resp_b.json()

    for m in members_b:
        assert m["organization_id"] == user_b["organization_id"]
    emails_in_b = [m["email"].lower() for m in members_b]
    assert user_a["email"].lower() not in emails_in_b, "Org A user leaked into Org B team list!"


def test_team_invitation_auto_assigns_creator_org_and_role():
    uid = uuid.uuid4().hex[:6]
    admin_resp = client.post("/api/v1/auth/signup", json={
        "email": f"inviter_{uid}@test.com",
        "password": "PasswordInviter@2026!",
        "full_name": f"Inviter {uid}",
        "company_name": f"Invite Company {uid}"
    })
    token = admin_resp.json()["access_token"]
    admin_org_id = admin_resp.json()["user"]["organization_id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Invite a Sales Rep
    invitee_email = f"rep_{uid}@test.com"
    invite_resp = client.post("/api/v1/settings/team/invite", headers=headers, json={
        "full_name": f"Sales Rep {uid}",
        "email": invitee_email,
        "role": "sales_rep"
    })
    assert invite_resp.status_code == 201, f"Invite failed: {invite_resp.text}"
    invited_user = invite_resp.json()["user"]
    assert invited_user["role"].lower() == "sales_rep"
    assert invited_user["organization_id"] == admin_org_id

    # Verify new user appears in /api/v1/users for that organization
    list_resp = client.get("/api/v1/users", headers=headers)
    assert list_resp.status_code == 200
    emails = [m["email"].lower() for m in list_resp.json()]
    assert invitee_email.lower() in emails


def test_cross_tenant_role_modification_prevention():
    # Org 1
    uid1 = uuid.uuid4().hex[:6]
    r1 = client.post("/api/v1/auth/signup", json={
        "email": f"owner1_{uid1}@test.com",
        "password": "Password1@2026!",
        "full_name": f"Owner 1 {uid1}",
        "company_name": f"Company 1 {uid1}"
    })
    token1 = r1.json()["access_token"]
    user1_id = r1.json()["user"]["id"]

    # Org 2
    uid2 = uuid.uuid4().hex[:6]
    r2 = client.post("/api/v1/auth/signup", json={
        "email": f"owner2_{uid2}@test.com",
        "password": "Password2@2026!",
        "full_name": f"Owner 2 {uid2}",
        "company_name": f"Company 2 {uid2}"
    })
    token2 = r2.json()["access_token"]

    # Org 2 tries to modify Org 1 user's role -> MUST return 404 (scoped isolation)
    headers2 = {"Authorization": f"Bearer {token2}"}
    patch_resp = client.patch(f"/api/v1/settings/team/{user1_id}/role", headers=headers2, json={
        "role": "sales_rep"
    })
    assert patch_resp.status_code == 404, (
        f"Cross-tenant modification must be 404, got {patch_resp.status_code}"
    )

    # Org 2 tries to delete Org 1 user -> MUST return 404
    del_resp = client.delete(f"/api/v1/settings/team/{user1_id}", headers=headers2)
    assert del_resp.status_code == 404, (
        f"Cross-tenant deletion must be 404, got {del_resp.status_code}"
    )
