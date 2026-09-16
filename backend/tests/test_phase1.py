import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase1_health_and_root():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        health = await ac.get("/api/health")
        assert health.status_code == 200
        assert health.json()["status"] == "healthy"

        root = await ac.get("/")
        assert root.status_code == 200
        assert "docs" in root.json()

@pytest.mark.asyncio
async def test_phase1_consumer_registration():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_email = f"consumer_{uuid.uuid4().hex[:8]}@example.com"
        res = await ac.post("/api/v1/auth/register", json={
            "email": unique_email,
            "password": "SecurePassword123!",
            "first_name": "Jane",
            "last_name": "Doe",
            "phone": "+1-555-1234",
            "role": "consumer"
        })
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == unique_email
        assert data["role"] == "consumer"
        assert "access_token" in data
        assert "refresh_token" in data

        # Check /auth/me for this consumer
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["role"] == "consumer"
        assert me_data["consumer_profile"] is not None

@pytest.mark.asyncio
async def test_phase1_client_registration():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_email = f"client_{uuid.uuid4().hex[:8]}@business.com"
        res = await ac.post("/api/v1/auth/register", json={
            "email": unique_email,
            "password": "ClientPassword123!",
            "first_name": "Robert",
            "last_name": "Miller",
            "phone": "+1-555-5678",
            "role": "client",
            "business_name": "Miller Engineering Group",
            "service_area": "North America"
        })
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == unique_email
        assert data["role"] == "client"

        # Check /auth/me for this client
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["role"] == "client"
        assert me_data["client_profile"] is not None
        assert me_data["client_profile"]["business_name"] == "Miller Engineering Group"
        assert me_data["client_profile"]["approval_status"] == "PENDING_APPROVAL"

@pytest.mark.asyncio
async def test_phase1_authentication_flow_and_rejections():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_email = f"auth_test_{uuid.uuid4().hex[:8]}@example.com"
        correct_password = "CorrectPassword123!"

        # 1. Register
        await ac.post("/api/v1/auth/register", json={
            "email": unique_email,
            "password": correct_password,
            "first_name": "Auth",
            "last_name": "Tester",
            "role": "consumer"
        })

        # 2. Login with correct password
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": unique_email,
            "password": correct_password
        })
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert "access_token" in login_data
        assert "refresh_token" in login_data

        # 3. Login rejection with incorrect password
        bad_login = await ac.post("/api/v1/auth/login", json={
            "email": unique_email,
            "password": "WrongPassword999!"
        })
        assert bad_login.status_code == 401

        # 4. Token Refresh
        refresh_res = await ac.post("/api/v1/auth/refresh", json={
            "refresh_token": login_data["refresh_token"]
        })
        assert refresh_res.status_code == 200
        refresh_data = refresh_res.json()
        assert "access_token" in refresh_data
        assert refresh_data["access_token"] != login_data["access_token"]

@pytest.mark.asyncio
async def test_phase1_rbac_enforcement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        consumer_email = f"rbac_consumer_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": consumer_email,
            "password": "Password123!",
            "first_name": "RBAC",
            "last_name": "Consumer",
            "role": "consumer"
        })
        consumer_token = reg_res.json()["access_token"]
        consumer_headers = {"Authorization": f"Bearer {consumer_token}"}

        # Consumer MUST be forbidden from accessing admin endpoints
        admin_res = await ac.get("/api/v1/admin/users", headers=consumer_headers)
        assert admin_res.status_code == 403

        # Consumer MUST be forbidden from accessing client endpoints
        client_res = await ac.get("/api/v1/client/profile", headers=consumer_headers)
        assert client_res.status_code == 403

        # Unauthenticated request MUST be rejected with 401
        anon_res = await ac.get("/api/v1/auth/me")
        assert anon_res.status_code == 401
