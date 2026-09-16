import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_admin_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"

@pytest.mark.asyncio
async def test_client_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/login", json={
            "email": "proservices@acmecorp.com",
            "password": "ClientPassword123!"
        })
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "client"

import uuid

@pytest.mark.asyncio
async def test_consumer_registration_and_me():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        test_email = f"consumer_{uuid.uuid4().hex[:8]}@test.com"
        # Register new consumer
        reg_response = await ac.post("/api/v1/auth/register", json={
            "email": test_email,
            "password": "SecurePassword123!",
            "first_name": "Sarah",
            "last_name": "Connor",
            "phone": "+1-555-9999",
            "role": "consumer"
        })
        assert reg_response.status_code == 201
        reg_data = reg_response.json()
        token = reg_data["access_token"]
        assert reg_data["role"] == "consumer"

        # Verify /auth/me
        headers = {"Authorization": f"Bearer {token}"}
        me_response = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["email"] == test_email
        assert me_data["role"] == "consumer"

        # RBAC Check: Consumer should be forbidden from accessing admin users endpoint
        admin_res = await ac.get("/api/v1/admin/users", headers=headers)
        assert admin_res.status_code == 403

@pytest.mark.asyncio
async def test_public_services_and_categories():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        cat_res = await ac.get("/api/v1/public/categories")
        assert cat_res.status_code == 200
        categories = cat_res.json()
        assert len(categories) > 0

        svc_res = await ac.get("/api/v1/public/services")
        assert svc_res.status_code == 200
        services = svc_res.json()
        assert len(services) > 0
        assert "price" in services[0]

@pytest.mark.asyncio
async def test_full_order_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login as client to fetch existing service
        client_login = await ac.post("/api/v1/auth/login", json={
            "email": "proservices@acmecorp.com",
            "password": "ClientPassword123!"
        })
        client_token = client_login.json()["access_token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}

        client_services_res = await ac.get("/api/v1/client/services", headers=client_headers)
        assert client_services_res.status_code == 200
        client_services = client_services_res.json()
        target_service = client_services[0]

        # 2. Login as consumer
        consumer_login = await ac.post("/api/v1/auth/login", json={
            "email": "alex.consumer@example.com",
            "password": "ConsumerPassword123!"
        })
        consumer_token = consumer_login.json()["access_token"]
        consumer_headers = {"Authorization": f"Bearer {consumer_token}"}

        # 3. Consumer creates an order
        create_order_res = await ac.post("/api/v1/consumer/orders", json={
            "service_product_id": target_service["id"],
            "quantity": 1,
            "notes": "Urgent review needed by Friday."
        }, headers=consumer_headers)
        assert create_order_res.status_code == 201
        order = create_order_res.json()
        order_id = order["id"]
        assert order["status"] == "PENDING"

        # 4. Client accepts the order
        accept_res = await ac.patch(f"/api/v1/client/orders/{order_id}/status", json={
            "status": "ACCEPTED"
        }, headers=client_headers)
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "ACCEPTED"

        # 5. Client moves to IN_PROGRESS
        progress_res = await ac.patch(f"/api/v1/client/orders/{order_id}/status", json={
            "status": "IN_PROGRESS"
        }, headers=client_headers)
        assert progress_res.status_code == 200
        assert progress_res.json()["status"] == "IN_PROGRESS"

        # 6. Client marks COMPLETED
        complete_res = await ac.patch(f"/api/v1/client/orders/{order_id}/status", json={
            "status": "COMPLETED"
        }, headers=client_headers)
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == "COMPLETED"

        # 7. Consumer submits a review
        review_res = await ac.post(f"/api/v1/consumer/orders/{order_id}/review", json={
            "rating": 5,
            "comment": "Outstanding service and thorough architectural breakdown!"
        }, headers=consumer_headers)
        assert review_res.status_code == 201
        review_data = review_res.json()
        assert review_data["rating"] == 5

        # 8. Consumer checks notification
        notif_res = await ac.get("/api/v1/consumer/notifications", headers=consumer_headers)
        assert notif_res.status_code == 200
        assert len(notif_res.json()) > 0

