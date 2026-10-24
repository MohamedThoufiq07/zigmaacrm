import uuid
import pytest
import httpx
from app.core.security import create_access_token

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

def test_self_demotion_prevention_and_single_admin_guard():
    uid = uuid.uuid4().hex[:6]
    # Sign up primary admin
    signup_resp = client.post("/api/v1/auth/signup", json={
        "email": f"admin_guard_{uid}@testcorp.com",
        "password": "PasswordGuard@2026!",
        "full_name": f"Admin Guard {uid}",
        "company_name": f"Guard Corp {uid}"
    })
    assert signup_resp.status_code == 200
    token = signup_resp.json()["access_token"]
    admin_user = signup_resp.json()["user"]
    admin_id = admin_user["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Attempt self-demotion
    res_self = client.patch(
        f"/api/v1/team/{admin_id}/role",
        json={"role": "sales_rep"},
        headers=headers
    )
    assert res_self.status_code == 400
    assert "Cannot change your own role" in res_self.json().get("detail", "")

    # 2. Invite a new team member
    rep_email = f"rep_{uid}@testcorp.com"
    invite_resp = client.post(
        "/api/v1/team/invite",
        json={
            "email": rep_email,
            "full_name": f"Sales Rep {uid}",
            "role": "sales_rep",
            "password": "RepPassword@2026!"
        },
        headers=headers
    )
    assert invite_resp.status_code in [200, 201]
    rep_user = invite_resp.json()["user"]
    rep_id = rep_user["id"]

    # 3. Attempt to promote sales rep to admin (Must be rejected: organization can have strictly 1 admin)
    promote_resp = client.patch(
        f"/api/v1/team/{rep_id}/role",
        json={"role": "admin"},
        headers=headers
    )
    assert promote_resp.status_code == 400
    assert "one Administrator" in promote_resp.json().get("detail", "")

    # 4. Attempt to demote the organization admin (Must be rejected: admin is permanently locked)
    demote_admin_resp = client.patch(
        f"/api/v1/team/{admin_id}/role",
        json={"role": "sales_rep"},
        headers=headers
    )
    assert demote_admin_resp.status_code == 400
    assert "Cannot change your own role" in demote_admin_resp.json().get("detail", "")

    # 5. Log in as rep and ensure rep cannot invite members or delete admin
    rep_login = client.post("/api/v1/auth/login", json={
        "email": rep_email,
        "password": "Zigmaa@2026"
    })
    assert rep_login.status_code == 200
    rep_token = rep_login.json()["access_token"]
    rep_headers = {"Authorization": f"Bearer {rep_token}"}

    del_resp = client.delete(f"/api/v1/team/{admin_id}", headers=rep_headers)
    assert del_resp.status_code in [401, 403]


def test_super_admin_portal_endpoints():
    uid = uuid.uuid4().hex[:6]
    normal_email = f"normal_{uid}@mybusiness.com"

    # 0. Normal signup must be strictly FORBIDDEN from accessing super admin portal
    signup_normal = client.post("/api/v1/auth/signup", json={
        "email": normal_email,
        "password": "NormalPass@2026!",
        "full_name": f"Tenant Admin {uid}",
        "company_name": f"Tenant Corp {uid}"
    })
    assert signup_normal.status_code == 200
    normal_token = signup_normal.json()["access_token"]
    res_forbidden = client.get("/api/v1/admin/overview", headers={"Authorization": f"Bearer {normal_token}"})
    assert res_forbidden.status_code == 403
    assert "Super Admin privileges required" in res_forbidden.json().get("detail", "")

    # Dedicated master admin credentials MUST succeed
    login_super = client.post("/api/v1/auth/login", json={
        "email": "zigmaaadmin",
        "password": "adminzigmaa@123"
    }, headers={"X-Portal": "super_admin"})
    assert login_super.status_code == 200
    super_token = login_super.json()["access_token"]
    headers = {"Authorization": f"Bearer {super_token}"}

    # 1. Overview KPIs
    res_overview = client.get("/api/v1/admin/overview", headers=headers)
    assert res_overview.status_code == 200
    data = res_overview.json()
    assert "kpi" in data
    assert "system_health" in data
    assert "total_organizations" in data["kpi"]
    assert "database" in data["system_health"]

    # 2. Organizations list
    res_orgs = client.get("/api/v1/admin/organizations", headers=headers)
    assert res_orgs.status_code == 200
    orgs = res_orgs.json()
    assert isinstance(orgs, list)
    assert len(orgs) > 0

    first_org = orgs[0]
    org_id = first_org["id"]

    # 3. Change Plan
    res_plan = client.patch(
        f"/api/v1/admin/organizations/{org_id}/plan",
        json={"plan": "ENTERPRISE"},
        headers=headers
    )
    assert res_plan.status_code == 200
    assert res_plan.json()["plan"] == "ENTERPRISE"

    # 4. Extend Trial
    res_trial = client.patch(
        f"/api/v1/admin/organizations/{org_id}/trial",
        json={"days": 30},
        headers=headers
    )
    assert res_trial.status_code == 200
    assert "trial_ends_at" in res_trial.json()

    # 5. Update Status
    res_status = client.patch(
        f"/api/v1/admin/organizations/{org_id}/status",
        json={"status": "ACTIVE"},
        headers=headers
    )
    assert res_status.status_code == 200

    # 6. Update Quotas
    res_quotas = client.patch(
        f"/api/v1/admin/organizations/{org_id}/quotas",
        json={"max_users": 20, "max_whatsapp": 2500},
        headers=headers
    )
    assert res_quotas.status_code == 200
    assert res_quotas.json()["quotas"]["max_users"] == 20

    # 7. Impersonate
    res_imp = client.post(f"/api/v1/admin/impersonate/{org_id}", headers=headers)
    assert res_imp.status_code == 200
    assert "access_token" in res_imp.json()
    assert res_imp.json()["user"]["is_super_admin"] is True


def test_zigmaaadmin_login_credentials():
    # 1. Normal CRM login without X-Portal header MUST be strictly rejected with HTTP 401
    resp_rejected = client.post("/api/v1/auth/login", json={
        "email": "zigmaaadmin",
        "password": "adminzigmaa@123"
    })
    assert resp_rejected.status_code == 401
    assert "Incorrect email or password" in resp_rejected.json().get("detail", "")

    # 2. Dedicated Super Admin Portal login with X-Portal: super_admin MUST succeed with 200
    resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "zigmaaadmin",
            "password": "adminzigmaa@123"
        },
        headers={"X-Portal": "super_admin"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["is_super_admin"] is True
    assert data["user"]["role"].lower() in ["super_admin", "superadmin"]

    # 3. Test access to super admin overview using this token
    super_headers = {"Authorization": f"Bearer {data['access_token']}"}
    overview_resp = client.get("/api/v1/admin/overview", headers=super_headers)
    assert overview_resp.status_code == 200
    assert "kpi" in overview_resp.json()

