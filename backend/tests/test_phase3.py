import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase3_consumer_profile_full_update():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        email = f"consumer_p3_{uuid.uuid4().hex[:8]}@test.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": email,
            "password": "ConsumerPassword123!",
            "first_name": "InitialFirstName",
            "last_name": "InitialLastName",
            "phone": "+1-555-0000",
            "role": "consumer"
        })
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Fetch initial profile
        p_res = await ac.get("/api/v1/consumer/profile", headers=headers)
        assert p_res.status_code == 200
        p_data = p_res.json()
        assert p_data["first_name"] == "InitialFirstName"
        assert p_data["email"] == email

        # 2. Update profile with new name, phone, and address
        update_res = await ac.put("/api/v1/consumer/profile", headers=headers, json={
            "first_name": "UpdatedFirstName",
            "last_name": "UpdatedLastName",
            "phone": "+1-555-9999",
            "address_line1": "123 Innovation Way",
            "city": "Techville",
            "postal_code": "90210",
            "country": "US"
        })
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["first_name"] == "UpdatedFirstName"
        assert updated["last_name"] == "UpdatedLastName"
        assert updated["phone"] == "+1-555-9999"
        assert updated["address_line1"] == "123 Innovation Way"
        assert updated["city"] == "Techville"

@pytest.mark.asyncio
async def test_phase3_consumer_order_cancellation_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Get active service
        svc_res = await ac.get("/api/v1/public/services")
        assert svc_res.status_code == 200
        services = svc_res.json()
        assert len(services) > 0
        service_id = services[0]["id"]

        # Register consumer
        email = f"consumer_cancel_{uuid.uuid4().hex[:8]}@test.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": email,
            "password": "ConsumerPassword123!",
            "first_name": "Cancel",
            "last_name": "Tester",
            "role": "consumer"
        })
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create PENDING order
        order_res = await ac.post("/api/v1/consumer/orders", headers=headers, json={
            "service_product_id": service_id,
            "quantity": 2,
            "notes": "Test cancellation order",
            "payment_method": "card"
        })
        assert order_res.status_code == 201
        order = order_res.json()
        order_id = order["id"]
        assert order["status"] == "PENDING"

        # Cancel order
        cancel_res = await ac.post(f"/api/v1/consumer/orders/{order_id}/cancel", headers=headers)
        assert cancel_res.status_code == 200
        cancelled_order = cancel_res.json()
        assert cancelled_order["status"] == "CANCELLED"
        assert "Cancelled by consumer" in cancelled_order["rejection_reason"]

        # Try cancelling again -> error
        repeat_cancel = await ac.post(f"/api/v1/consumer/orders/{order_id}/cancel", headers=headers)
        assert repeat_cancel.status_code == 400
        assert "Cannot cancel order" in repeat_cancel.json()["detail"]

@pytest.mark.asyncio
async def test_phase3_consumer_notifications():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register consumer
        email = f"consumer_notif_{uuid.uuid4().hex[:8]}@test.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": email,
            "password": "ConsumerPassword123!",
            "first_name": "Notif",
            "last_name": "User",
            "role": "consumer"
        })
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get public service & place order to trigger notification flow
        svc_res = await ac.get("/api/v1/public/services")
        service_id = svc_res.json()[0]["id"]

        order_res = await ac.post("/api/v1/consumer/orders", headers=headers, json={
            "service_product_id": service_id,
            "quantity": 1
        })
        assert order_res.status_code == 201

        # Fetch notifications
        notif_res = await ac.get("/api/v1/consumer/notifications", headers=headers)
        assert notif_res.status_code == 200
        notifications = notif_res.json()
        assert isinstance(notifications, list)
