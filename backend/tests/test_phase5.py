import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase5_admin_authentication_and_analytics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        res = await ac.get("/api/v1/admin/analytics", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()

        expected_keys = [
            "total_users", "total_consumers", "total_clients", "approved_clients",
            "pending_client_approvals", "total_services", "total_orders", "active_orders",
            "pending_orders", "completed_orders", "cancelled_orders",
            "gross_merchandise_value", "total_platform_revenue", "pending_payouts"
        ]
        for key in expected_keys:
            assert key in data, f"Missing key {key} in admin analytics response"

@pytest.mark.asyncio
async def test_phase5_unauthorized_access_blocking():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Consumer attempting admin routes
        consumer_res = await ac.post("/api/v1/auth/register", json={
            "email": f"unauth_cons_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Unauth",
            "last_name": "Consumer",
            "role": "consumer"
        })
        c_token = consumer_res.json()["access_token"]
        c_headers = {"Authorization": f"Bearer {c_token}"}

        # Client attempting admin routes
        client_res = await ac.post("/api/v1/auth/register", json={
            "email": f"unauth_client_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "Unauth",
            "last_name": "Client",
            "role": "client",
            "business_name": "Unauth Client Enterprise"
        })
        v_token = client_res.json()["access_token"]
        v_headers = {"Authorization": f"Bearer {v_token}"}

        endpoints = [
            "/api/v1/admin/analytics",
            "/api/v1/admin/users",
            "/api/v1/admin/clients/pending",
            "/api/v1/admin/orders",
            "/api/v1/admin/audit-logs",
            "/api/v1/admin/services",
            "/api/v1/admin/reviews",
            "/api/v1/admin/notifications"
        ]

        for ep in endpoints:
            c_res = await ac.get(ep, headers=c_headers)
            assert c_res.status_code == 403, f"Consumer should be blocked from {ep}"

            v_res = await ac.get(ep, headers=v_headers)
            assert v_res.status_code == 200, f"Owner should be allowed on {ep} under Owner + Admin access model"

@pytest.mark.asyncio
async def test_phase5_client_and_consumer_management_with_search():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Register distinct consumer
        unique_name = f"Zackary_{uuid.uuid4().hex[:6]}"
        cons_res = await ac.post("/api/v1/auth/register", json={
            "email": f"{unique_name.lower()}@test.com",
            "password": "Password123!",
            "first_name": unique_name,
            "last_name": "SearchTarget",
            "role": "consumer"
        })
        cons_data = cons_res.json()

        # 1. Search users
        search_res = await ac.get("/api/v1/admin/users", headers=admin_headers, params={"q": unique_name})
        assert search_res.status_code == 200
        found_users = search_res.json()
        assert len(found_users) >= 1
        assert found_users[0]["first_name"] == unique_name

        # 2. Update user account status to SUSPENDED
        user_id = cons_data["user_id"]
        suspend_res = await ac.patch(
            f"/api/v1/admin/users/{user_id}/status",
            headers=admin_headers,
            json={"status": "SUSPENDED", "reason": "Policy violation test"}
        )
        assert suspend_res.status_code == 200

        # Reactivate
        reactivate_res = await ac.patch(
            f"/api/v1/admin/users/{user_id}/status",
            headers=admin_headers,
            json={"status": "ACTIVE"}
        )
        assert reactivate_res.status_code == 200

@pytest.mark.asyncio
async def test_phase5_service_order_and_review_governance():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Setup approved client
        client_res = await ac.post("/api/v1/auth/register", json={
            "email": f"gov_client_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "Gov",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "Governance Vendor Inc"
        })
        client_headers = {"Authorization": f"Bearer {client_res.json()['access_token']}"}
        prof = (await ac.get("/api/v1/client/profile", headers=client_headers)).json()
        await ac.patch(f"/api/v1/admin/clients/{prof['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        # Category
        cat_id = (await ac.get("/api/v1/public/categories")).json()[0]["id"]

        # Create service
        svc = (await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": cat_id,
            "title": "Governance Test Service",
            "description": "High compliance consulting",
            "price": 400.00
        })).json()

        # 1. Admin toggles service availability
        toggle_res = await ac.patch(f"/api/v1/admin/services/{svc['id']}/toggle", headers=admin_headers)
        assert toggle_res.status_code == 200
        assert toggle_res.json()["is_available"] is False

        # Toggle back
        await ac.patch(f"/api/v1/admin/services/{svc['id']}/toggle", headers=admin_headers)

        # 2. Consumer creates order
        consumer_res = await ac.post("/api/v1/auth/register", json={
            "email": f"gov_cons_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Gov",
            "last_name": "Buyer",
            "role": "consumer"
        })
        consumer_headers = {"Authorization": f"Bearer {consumer_res.json()['access_token']}"}

        order = (await ac.post("/api/v1/consumer/orders", headers=consumer_headers, json={
            "service_product_id": svc["id"],
            "quantity": 1
        })).json()

        # 3. Admin administrative cancellation
        cancel_res = await ac.patch(
            f"/api/v1/admin/orders/{order['id']}/cancel",
            headers=admin_headers,
            params={"reason": "Dispute investigation"}
        )
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "CANCELLED"

        # 4. Verify Audit Logs
        logs_res = await ac.get("/api/v1/admin/audit-logs", headers=admin_headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert len(logs) > 0
        actions = [log["action"] for log in logs]
        assert "ADMIN_CANCEL_ORDER" in actions
        assert "ADMIN_TOGGLE_SERVICE_AVAILABILITY" in actions
