import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_phase4_client_profile_and_contact_update():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        email = f"client_p4_{uuid.uuid4().hex[:8]}@vendor.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": email,
            "password": "VendorPassword123!",
            "first_name": "Marcus",
            "last_name": "Vance",
            "phone": "+1-555-0100",
            "role": "client",
            "business_name": "Vance Tech Solutions",
            "service_area": "Global"
        })
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Fetch profile
        p_res = await ac.get("/api/v1/client/profile", headers=headers)
        assert p_res.status_code == 200
        p_data = p_res.json()
        assert p_data["business_name"] == "Vance Tech Solutions"
        assert p_data["first_name"] == "Marcus"
        assert p_data["email"] == email

        # 2. Update business and contact person info
        up_res = await ac.put("/api/v1/client/profile", headers=headers, json={
            "business_name": "Vance Enterprise Cloud",
            "business_registration_no": "REG-990011",
            "service_area": "North America",
            "bio": "Leading provider of cloud architecture",
            "first_name": "Marcus Aurelius",
            "last_name": "Vance",
            "phone": "+1-555-9999"
        })
        assert up_res.status_code == 200
        updated = up_res.json()
        assert updated["business_name"] == "Vance Enterprise Cloud"
        assert updated["business_registration_no"] == "REG-990011"
        assert updated["first_name"] == "Marcus Aurelius"
        assert updated["phone"] == "+1-555-9999"

@pytest.mark.asyncio
async def test_phase4_client_service_crud_and_approval_gating():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Get active category
        cat_res = await ac.get("/api/v1/public/categories")
        category_id = cat_res.json()[0]["id"]

        # 1. Register new client (status: PENDING_APPROVAL)
        email = f"client_svc_{uuid.uuid4().hex[:8]}@vendor.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": email,
            "password": "VendorPassword123!",
            "first_name": "Dave",
            "last_name": "Services",
            "role": "client",
            "business_name": "Dave Cloud Consulting"
        })
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Try to create service while PENDING_APPROVAL -> 403 Forbidden
        create_attempt = await ac.post("/api/v1/client/services", headers=headers, json={
            "category_id": category_id,
            "title": "Cloud Migration Audit",
            "description": "Comprehensive AWS and Azure architectural review",
            "price": 550.00,
            "duration_minutes": 90,
            "is_available": True
        })
        assert create_attempt.status_code == 403
        assert "must be APPROVED" in create_attempt.json()["detail"]

        # 3. Admin approves client
        profile_res = await ac.get("/api/v1/client/profile", headers=headers)
        client_profile_id = profile_res.json()["id"]

        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        app_res = await ac.patch(
            f"/api/v1/admin/clients/{client_profile_id}/approval",
            headers=admin_headers,
            json={"approval_status": "APPROVED"}
        )
        assert app_res.status_code == 200

        # 4. Now create service -> 201 Created
        svc_create = await ac.post("/api/v1/client/services", headers=headers, json={
            "category_id": category_id,
            "title": "Cloud Migration Audit",
            "description": "Comprehensive AWS and Azure architectural review",
            "price": 550.00,
            "duration_minutes": 90,
            "is_available": True
        })
        assert svc_create.status_code == 201
        svc = svc_create.json()
        service_id = svc["id"]
        assert svc["title"] == "Cloud Migration Audit"

        # 5. List client's services
        list_res = await ac.get("/api/v1/client/services", headers=headers)
        assert list_res.status_code == 200
        services_list = list_res.json()
        assert any(s["id"] == service_id for s in services_list)

        # 6. Update service
        update_res = await ac.put(f"/api/v1/client/services/{service_id}", headers=headers, json={
            "title": "Advanced Cloud Architecture Audit",
            "price": 699.00
        })
        assert update_res.status_code == 200
        assert update_res.json()["title"] == "Advanced Cloud Architecture Audit"
        assert float(update_res.json()["price"]) == 699.00

        # 7. Delete service
        del_res = await ac.delete(f"/api/v1/client/services/{service_id}", headers=headers)
        assert del_res.status_code == 200

        # Verify deletion
        list_after = await ac.get("/api/v1/client/services", headers=headers)
        assert not any(s["id"] == service_id for s in list_after.json())

@pytest.mark.asyncio
async def test_phase4_client_isolation_and_ownership_walls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        cat_res = await ac.get("/api/v1/public/categories")
        category_id = cat_res.json()[0]["id"]

        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Create Client A
        cA_res = await ac.post("/api/v1/auth/register", json={
            "email": f"clientA_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "Password123!",
            "first_name": "Client",
            "last_name": "A",
            "role": "client",
            "business_name": "Client A Corp"
        })
        tokenA = cA_res.json()["access_token"]
        headersA = {"Authorization": f"Bearer {tokenA}"}

        profA = (await ac.get("/api/v1/client/profile", headers=headersA)).json()
        await ac.patch(f"/api/v1/admin/clients/{profA['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        # Client A creates a service
        svcA = (await ac.post("/api/v1/client/services", headers=headersA, json={
            "category_id": category_id,
            "title": "Service A Exclusive",
            "description": "Exclusive service created by Client A",
            "price": 200.00
        })).json()

        # Create Client B
        cB_res = await ac.post("/api/v1/auth/register", json={
            "email": f"clientB_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "Password123!",
            "first_name": "Client",
            "last_name": "B",
            "role": "client",
            "business_name": "Client B Corp"
        })
        tokenB = cB_res.json()["access_token"]
        headersB = {"Authorization": f"Bearer {tokenB}"}

        profB = (await ac.get("/api/v1/client/profile", headers=headersB)).json()
        await ac.patch(f"/api/v1/admin/clients/{profB['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        # Client B attempts to update Client A's service -> 404 Not Found (scoped out)
        up_attempt = await ac.put(f"/api/v1/client/services/{svcA['id']}", headers=headersB, json={
            "title": "Hacked Service Title"
        })
        assert up_attempt.status_code == 404

        # Client B attempts to delete Client A's service -> 404 Not Found (scoped out)
        del_attempt = await ac.delete(f"/api/v1/client/services/{svcA['id']}", headers=headersB)
        assert del_attempt.status_code == 404

@pytest.mark.asyncio
async def test_phase4_client_customers_payments_notifications():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # 1. Register Client & approve
        client_res = await ac.post("/api/v1/auth/register", json={
            "email": f"client_full_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "Full",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "Full Lifecycle Vendor"
        })
        client_token = client_res.json()["access_token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}

        prof = (await ac.get("/api/v1/client/profile", headers=client_headers)).json()
        await ac.patch(f"/api/v1/admin/clients/{prof['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        cat_res = await ac.get("/api/v1/public/categories")
        cat_id = cat_res.json()[0]["id"]

        svc = (await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": cat_id,
            "title": "Standard Consulting Service",
            "description": "Expert 1-on-1 advisory session",
            "price": 300.00
        })).json()

        # 2. Register Consumer and place order
        consumer_res = await ac.post("/api/v1/auth/register", json={
            "email": f"consumer_full_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Alice",
            "last_name": "Buyer",
            "role": "consumer"
        })
        consumer_token = consumer_res.json()["access_token"]
        consumer_headers = {"Authorization": f"Bearer {consumer_token}"}

        order = (await ac.post("/api/v1/consumer/orders", headers=consumer_headers, json={
            "service_product_id": svc["id"],
            "quantity": 1,
            "notes": "Looking forward to working together."
        })).json()

        # 3. Client checks /client/customers
        cust_res = await ac.get("/api/v1/client/customers", headers=client_headers)
        assert cust_res.status_code == 200
        customers = cust_res.json()
        assert len(customers) == 1
        assert customers[0]["name"] == "Alice Buyer"
        assert customers[0]["total_orders"] == 1

        # 4. Client checks /client/payments
        pay_res = await ac.get("/api/v1/client/payments", headers=client_headers)
        assert pay_res.status_code == 200
        payments = pay_res.json()
        assert len(payments) == 1
        assert float(payments[0]["amount"]) == 300.00

        # 5. Client checks /client/notifications
        notif_res = await ac.get("/api/v1/client/notifications", headers=client_headers)
        assert notif_res.status_code == 200
        notifs = notif_res.json()
        assert len(notifs) > 0

        # 6. Client marks notification as read
        notif_id = notifs[0]["id"]
        read_res = await ac.patch(f"/api/v1/client/notifications/{notif_id}/read", headers=client_headers)
        assert read_res.status_code == 200
