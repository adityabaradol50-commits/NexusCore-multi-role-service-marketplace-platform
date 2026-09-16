import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase2_client_approval_lifecycle_and_business_gate():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 0. Get an active category ID
        cat_res = await ac.get("/api/v1/public/categories")
        assert cat_res.status_code == 200
        categories = cat_res.json()
        assert len(categories) > 0
        category_id = categories[0]["id"]

        # 1. Register a new client
        client_email = f"client_gate_{uuid.uuid4().hex[:8]}@vendor.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": client_email,
            "password": "VendorPassword123!",
            "first_name": "Marcus",
            "last_name": "Vance",
            "phone": "+1-555-8888",
            "role": "client",
            "business_name": "Vance Cloud Solutions",
            "business_description": "Cloud hosting and architecture",
            "service_area": "Global"
        })
        assert reg_res.status_code == 201
        client_data = reg_res.json()
        client_token = client_data["access_token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}

        # 2. Verify new client has PENDING_APPROVAL
        profile_res = await ac.get("/api/v1/client/profile", headers=client_headers)
        assert profile_res.status_code == 200
        client_profile = profile_res.json()
        assert client_profile["approval_status"] == "PENDING_APPROVAL"
        client_profile_id = client_profile["id"]

        # 3. Verify unapproved client CANNOT publish service offerings (Business Gating)
        service_attempt = await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": category_id,
            "title": "Cloud Infrastructure Setup",
            "description": "High availability AWS setup and cloud migration",
            "price": 1200.00,
            "duration_minutes": 120,
            "is_available": True
        })
        assert service_attempt.status_code == 403
        assert "must be APPROVED" in service_attempt.json()["detail"]

        # 4. Login as Admin
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 5. Admin lists pending clients
        pending_res = await ac.get("/api/v1/admin/clients/pending", headers=admin_headers)
        assert pending_res.status_code == 200
        pending_list = pending_res.json()
        assert any(c["id"] == client_profile_id for c in pending_list)

        # 6. Admin approves client
        approval_res = await ac.patch(
            f"/api/v1/admin/clients/{client_profile_id}/approval",
            headers=admin_headers,
            json={"approval_status": "APPROVED"}
        )
        assert approval_res.status_code == 200
        assert approval_res.json()["approval_status"] == "APPROVED"

        # 7. Audit log is recorded for this approval
        audit_res = await ac.get("/api/v1/admin/audit-logs", headers=admin_headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert any(l["action"] == "CLIENT_APPROVAL_APPROVED" and l["target_id"] == client_profile_id for l in logs)

        # 8. Now client CAN create services
        service_success = await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": category_id,
            "title": "Cloud Infrastructure Setup",
            "description": "High availability AWS setup and cloud migration",
            "price": 1200.00,
            "duration_minutes": 120,
            "is_available": True
        })
        assert service_success.status_code == 201
        assert service_success.json()["title"] == "Cloud Infrastructure Setup"

@pytest.mark.asyncio
async def test_phase2_admin_portal_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Admin analytics
        analytics = await ac.get("/api/v1/admin/analytics", headers=admin_headers)
        assert analytics.status_code == 200
        data = analytics.json()
        assert "total_users" in data
        assert "gross_merchandise_value" in data

        # 2. Admin services catalog
        services = await ac.get("/api/v1/admin/services", headers=admin_headers)
        assert services.status_code == 200
        assert isinstance(services.json(), list)

        # 3. Admin orders ledger
        orders = await ac.get("/api/v1/admin/orders", headers=admin_headers)
        assert orders.status_code == 200
        assert isinstance(orders.json(), list)

        # 4. Admin reviews
        reviews = await ac.get("/api/v1/admin/reviews", headers=admin_headers)
        assert reviews.status_code == 200
        assert isinstance(reviews.json(), list)

@pytest.mark.asyncio
async def test_phase2_role_segregation_and_authorization_walls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create Consumer
        c_res = await ac.post("/api/v1/auth/register", json={
            "email": f"c_wall_{uuid.uuid4().hex[:8]}@test.com",
            "password": "Password123!",
            "first_name": "Consumer",
            "last_name": "Wall",
            "role": "consumer"
        })
        c_token = c_res.json()["access_token"]
        c_headers = {"Authorization": f"Bearer {c_token}"}

        # Create Client
        cl_res = await ac.post("/api/v1/auth/register", json={
            "email": f"cl_wall_{uuid.uuid4().hex[:8]}@test.com",
            "password": "Password123!",
            "first_name": "Client",
            "last_name": "Wall",
            "role": "client",
            "business_name": "Wall Inc"
        })
        cl_token = cl_res.json()["access_token"]
        cl_headers = {"Authorization": f"Bearer {cl_token}"}

        # Consumer cannot access Client endpoints (403)
        assert (await ac.get("/api/v1/client/services", headers=c_headers)).status_code == 403
        assert (await ac.get("/api/v1/client/orders", headers=c_headers)).status_code == 403

        # Consumer cannot access Admin endpoints (403)
        assert (await ac.get("/api/v1/admin/analytics", headers=c_headers)).status_code == 403
        assert (await ac.get("/api/v1/admin/audit-logs", headers=c_headers)).status_code == 403

        # Client cannot access Consumer endpoints (403)
        assert (await ac.get("/api/v1/consumer/orders", headers=cl_headers)).status_code == 403
        assert (await ac.get("/api/v1/consumer/profile", headers=cl_headers)).status_code == 403

        # Client (Owner) can access Admin endpoints (Owner + Admin role model)
        assert (await ac.get("/api/v1/admin/analytics", headers=cl_headers)).status_code == 200
        assert (await ac.get("/api/v1/admin/users", headers=cl_headers)).status_code == 200
