import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase7_authentication_and_invalid_tokens():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Missing Authorization header -> 401
        res1 = await ac.get("/api/v1/consumer/profile")
        assert res1.status_code == 401

        # 2. Invalid Bearer Token -> 401
        res2 = await ac.get("/api/v1/consumer/profile", headers={"Authorization": "Bearer invalid_token_12345"})
        assert res2.status_code == 401

@pytest.mark.asyncio
async def test_phase7_cross_role_and_rbac_enforcement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register Consumer
        c_res = await ac.post("/api/v1/auth/register", json={
            "email": f"p7_cons_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "P7",
            "last_name": "Consumer",
            "role": "consumer"
        })
        c_token = c_res.json()["access_token"]
        c_headers = {"Authorization": f"Bearer {c_token}"}

        # Register Client
        v_res = await ac.post("/api/v1/auth/register", json={
            "email": f"p7_vendor_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "P7",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "P7 Vendor Corp"
        })
        v_token = v_res.json()["access_token"]
        v_headers = {"Authorization": f"Bearer {v_token}"}

        # Consumer hitting client / admin routes -> 403 Forbidden
        assert (await ac.get("/api/v1/client/profile", headers=c_headers)).status_code == 403
        assert (await ac.get("/api/v1/client/services", headers=c_headers)).status_code == 403
        assert (await ac.get("/api/v1/admin/analytics", headers=c_headers)).status_code == 403

        # Client hitting consumer routes -> 403 Forbidden; hitting admin routes -> 200 OK (Owner + Admin access model)
        assert (await ac.get("/api/v1/consumer/profile", headers=v_headers)).status_code == 403
        assert (await ac.get("/api/v1/consumer/orders", headers=v_headers)).status_code == 403
        assert (await ac.get("/api/v1/admin/analytics", headers=v_headers)).status_code == 200

@pytest.mark.asyncio
async def test_phase7_idor_and_cross_user_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Setup Client
        client_res = await ac.post("/api/v1/auth/register", json={
            "email": f"idor_vendor_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "IDOR",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "IDOR Vendor Inc"
        })
        client_headers = {"Authorization": f"Bearer {client_res.json()['access_token']}"}
        prof = (await ac.get("/api/v1/client/profile", headers=client_headers)).json()
        await ac.patch(f"/api/v1/admin/clients/{prof['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        cat_id = (await ac.get("/api/v1/public/categories")).json()[0]["id"]
        svc = (await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": cat_id,
            "title": "IDOR Isolation Service",
            "description": "Testing cross user order isolation",
            "price": 150.00
        })).json()

        # Consumer A
        cA_res = await ac.post("/api/v1/auth/register", json={
            "email": f"idor_consA_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Alice",
            "last_name": "A",
            "role": "consumer"
        })
        headersA = {"Authorization": f"Bearer {cA_res.json()['access_token']}"}

        # Consumer B
        cB_res = await ac.post("/api/v1/auth/register", json={
            "email": f"idor_consB_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Bob",
            "last_name": "B",
            "role": "consumer"
        })
        headersB = {"Authorization": f"Bearer {cB_res.json()['access_token']}"}

        # Consumer A creates order
        orderA = (await ac.post("/api/v1/consumer/orders", headers=headersA, json={
            "service_product_id": svc["id"],
            "quantity": 1
        })).json()

        # 1. Consumer B attempts to read Consumer A's order -> 404 Not Found (scoped out)
        res_orderB = await ac.get(f"/api/v1/consumer/orders/{orderA['id']}", headers=headersB)
        assert res_orderB.status_code == 404

        # 2. Consumer B attempts to read Consumer A's receipt -> 404 Not Found (scoped out)
        res_recB = await ac.get(f"/api/v1/consumer/orders/{orderA['id']}/receipt", headers=headersB)
        assert res_recB.status_code == 404

        # 3. Consumer A can read their own receipt -> 200 OK
        res_recA = await ac.get(f"/api/v1/consumer/orders/{orderA['id']}/receipt", headers=headersA)
        assert res_recA.status_code == 200
        assert res_recA.json()["order_number"] == orderA["order_number"]

        # 4. Client provider can read receipt for order they manage -> 200 OK
        res_recClient = await ac.get(f"/api/v1/client/orders/{orderA['id']}/receipt", headers=client_headers)
        assert res_recClient.status_code == 200

        # 5. Admin can read receipt for any order -> 200 OK
        res_recAdmin = await ac.get(f"/api/v1/admin/orders/{orderA['id']}/receipt", headers=admin_headers)
        assert res_recAdmin.status_code == 200

@pytest.mark.asyncio
async def test_phase7_suspended_account_blocking():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Register consumer
        cons_res = await ac.post("/api/v1/auth/register", json={
            "email": f"suspend_test_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Suspended",
            "last_name": "User",
            "role": "consumer"
        })
        token = cons_res.json()["access_token"]
        user_id = cons_res.json()["user_id"]
        headers = {"Authorization": f"Bearer {token}"}

        # Normal access -> 200
        ok_res = await ac.get("/api/v1/consumer/profile", headers=headers)
        assert ok_res.status_code == 200

        # Admin suspends user
        await ac.patch(f"/api/v1/admin/users/{user_id}/status", headers=admin_headers, json={"status": "SUSPENDED"})

        # Suspended user attempts access -> 403 Forbidden
        blocked_res = await ac.get("/api/v1/consumer/profile", headers=headers)
        assert blocked_res.status_code == 403
        assert "suspended" in blocked_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_phase7_public_catalog_security():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Register unapproved client
        client_res = await ac.post("/api/v1/auth/register", json={
            "email": f"unapp_vendor_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "Unapproved",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "Unapproved Vendor Business"
        })
        client_headers = {"Authorization": f"Bearer {client_res.json()['access_token']}"}

        # Admin approves client, creates service, then toggles off availability
        prof = (await ac.get("/api/v1/client/profile", headers=client_headers)).json()
        await ac.patch(f"/api/v1/admin/clients/{prof['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        cat_id = (await ac.get("/api/v1/public/categories")).json()[0]["id"]
        svc = (await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": cat_id,
            "title": "Hidden Product Test",
            "description": "Product that will be hidden",
            "price": 99.00
        })).json()

        # Admin hides service
        await ac.patch(f"/api/v1/admin/services/{svc['id']}/toggle", headers=admin_headers)

        # Public direct GET /public/services/{id} -> 404 Not Found
        pub_get = await ac.get(f"/api/v1/public/services/{svc['id']}")
        assert pub_get.status_code == 404
