import pytest
from fastapi.testclient import TestClient


def test_auth_demo_accounts_endpoint(client: TestClient):
    response = client.get("/api/v1/auth/demo-accounts")
    assert response.status_code == 200
    data = response.json()
    assert "accounts" in data
    roles = {acc["role"] for acc in data["accounts"]}
    assert "admin" in roles
    assert "normal" in roles


def test_admin_login_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@LogPilot2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "admin"
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "admin"


def test_normal_user_login_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Operator@LogPilot2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "normal"
    assert data["user"]["username"] == "operator"
    assert data["user"]["role"] == "normal"


def test_login_invalid_password(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "WrongPassword123!"},
    )
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "unknown_user_999", "password": "Password123!"},
    )
    assert response.status_code == 401


def test_get_current_profile_me_endpoint(client: TestClient):
    # Login as admin
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@LogPilot2026!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Call /auth/me with Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "admin"
    assert me_data["role"] == "admin"


def test_get_current_profile_without_token(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_jwt_role_enforcement_normal_vs_admin(client: TestClient):
    # 1. Login as normal operator
    normal_login = client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Operator@LogPilot2026!"},
    )
    assert normal_login.status_code == 200
    normal_token = normal_login.json()["access_token"]

    # Normal user should be rejected (403) from executing remediation playbooks
    normal_exec = client.post(
        "/api/v1/remediation/playbooks/PB-101/simulate",
        json={"dry_run": True, "enforce_approvals": False},
        headers={"Authorization": f"Bearer {normal_token}"},
    )
    assert normal_exec.status_code == 403
    assert "Insufficient privileges" in normal_exec.json()["detail"]

    # 2. Login as admin
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@LogPilot2026!"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    # Admin user should be accepted (200)
    admin_exec = client.post(
        "/api/v1/remediation/playbooks/PB-101/simulate",
        json={"dry_run": True, "enforce_approvals": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_exec.status_code == 200
    assert admin_exec.json()["all_passed"] is True


def test_register_new_normal_user_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "new_operator",
            "email": "new_operator@example.com",
            "password": "Password123!",
            "full_name": "New SRE Operator",
            "role": "normal",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "normal"
    assert data["user"]["username"] == "new_operator"
    assert data["user"]["email"] == "new_operator@example.com"


def test_register_new_admin_user_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "new_admin",
            "email": "new_admin@example.com",
            "password": "Password123!",
            "full_name": "New Admin User",
            "role": "admin",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "admin"
    assert data["user"]["username"] == "new_admin"


def test_register_duplicate_username_conflict(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "admin",
            "email": "another_admin@example.com",
            "password": "Password123!",
        },
    )
    assert response.status_code == 409
    assert "already taken" in response.json()["detail"]


def test_register_short_password_validation(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "valid_user",
            "email": "valid@example.com",
            "password": "123",
        },
    )
    assert response.status_code == 400
    assert "at least 6 characters" in response.json()["detail"]
