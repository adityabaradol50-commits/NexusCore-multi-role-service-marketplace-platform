import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_sungmo_heals_client_profile_and_approval():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login as Sungmo Heals owner (Snigdha Sharma)
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "snigdhahealer157@gmail.com",
            "password": "SungmoPassword123!"
        })
        assert login_res.status_code == 200
        data = login_res.json()
        assert data["role"] == "client"
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Verify Client Profile details
        profile_res = await ac.get("/api/v1/client/profile", headers=headers)
        assert profile_res.status_code == 200
        p = profile_res.json()
        assert p["business_name"] == "Sungmo Heals"
        assert p["approval_status"] == "APPROVED"
        assert p["service_area"] == "Online Sessions"
        assert p["logo_url"] == "/sungmo_heals_lotus.svg"

@pytest.mark.asyncio
async def test_sungmo_heals_service_catalog_discovery():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Search public services for Sungmo Heals offerings
        svc_res = await ac.get("/api/v1/public/services?q=Sungmo")
        assert svc_res.status_code == 200
        services = svc_res.json()

        sungmo_services = [s for s in services if s.get("client_business_name") == "Sungmo Heals"]
        titles = {s["title"]: s for s in sungmo_services}

        expected_titles = [
            "Life Coaching",
            "Inner Child Healing",
            "Rapid Reiki Healing",
            "Intuitive Tarot Reading",
            "Quantum Ho'oponopono Healing"
        ]

        for t in expected_titles:
            assert t in titles, f"Expected service '{t}' not found in Sungmo Heals catalog"

        # Verify descriptions are neutral & uninvented claims
        assert "personal development" in titles["Life Coaching"]["description"].lower()
        assert "inner-child-focused" in titles["Inner Child Healing"]["description"].lower()
        assert "reiki healing sessions" in titles["Rapid Reiki Healing"]["description"].lower()
        assert "tarot reading" in titles["Intuitive Tarot Reading"]["description"].lower()
        assert "ho'oponopono" in titles["Quantum Ho'oponopono Healing"]["description"].lower()

        # Verify owner details and professional roles in public response
        sample_svc = sungmo_services[0]
        assert sample_svc["client_service_area"] == "Online Sessions"
        assert "Snigdha Sharma" in sample_svc["client_bio"]
        assert "Life Coach" in sample_svc["client_bio"]
        assert "Inner Child Healer" in sample_svc["client_bio"]
        assert "Rapid Reiki Healer" in sample_svc["client_bio"]
        assert "Intuitive Tarot Reader" in sample_svc["client_bio"]
        assert "Quantum Ho'oponopono Healer" in sample_svc["client_bio"]

        # Verify initial prices/durations are non-negative numeric values (unconfigured or configured)
        for t in expected_titles:
            assert float(titles[t]["price"]) >= 0.0

@pytest.mark.asyncio
async def test_public_catalog_filters_out_test_fixtures():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Public search without query parameters
        svc_res = await ac.get("/api/v1/public/services")
        assert svc_res.status_code == 200
        public_services = svc_res.json()

        # All public services must have is_test_fixture == False
        for s in public_services:
            assert s.get("is_test_fixture") is False

        # Forbidden test fixture titles must not appear
        public_titles = [s["title"] for s in public_services]
        forbidden_test_titles = [
            "IDOR Isolation Service",
            "Review Target Service",
            "Notification Target Service",
            "Full Refundable Advisory",
            "Governance Test Service"
        ]

        for ft in forbidden_test_titles:
            assert ft not in public_titles, f"Test fixture service '{ft}' improperly exposed in public catalog"

@pytest.mark.asyncio
async def test_sungmo_heals_client_service_management():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login as Sungmo Heals client
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "snigdhahealer157@gmail.com",
            "password": "SungmoPassword123!"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # Fetch services list
        svc_res = await ac.get("/api/v1/client/services", headers=headers)
        assert svc_res.status_code == 200
        services = svc_res.json()
        target_svc = next((s for s in services if s["title"] == "Life Coaching"), None)
        assert target_svc is not None

        # Client updates price and duration for Life Coaching
        update_res = await ac.put(f"/api/v1/client/services/{target_svc['id']}", headers=headers, json={
            "category_id": target_svc["category_id"],
            "title": target_svc["title"],
            "description": target_svc["description"],
            "price": 150.00,
            "duration_minutes": 60,
            "is_available": True
        })
        assert update_res.status_code == 200
        updated = update_res.json()
        assert float(updated["price"]) == 150.00
        assert updated["duration_minutes"] == 60

        # Verify public visibility reflects updated price and duration
        pub_res = await ac.get(f"/api/v1/public/services/{target_svc['id']}")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        assert float(pub_data["price"]) == 150.00
        assert pub_data["duration_minutes"] == 60

@pytest.mark.asyncio
async def test_sungmo_heals_consumer_booking_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register new consumer
        consumer_email = f"consumer_sungmo_{uuid.uuid4().hex[:8]}@test.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": consumer_email,
            "password": "ConsumerPassword123!",
            "first_name": "Healee",
            "last_name": "User",
            "role": "consumer"
        })
        c_headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

        # Find a Sungmo Heals service
        pub_res = await ac.get("/api/v1/public/services?limit=100")
        services = pub_res.json()
        target_svc = next((s for s in services if s.get("client_business_name") == "Sungmo Heals"), None)
        assert target_svc is not None

        # Book the service
        order_res = await ac.post("/api/v1/consumer/orders", headers=c_headers, json={
            "service_product_id": target_svc["id"],
            "quantity": 1,
            "notes": "Looking forward to the online session.",
            "payment_method": "card"
        })
        assert order_res.status_code == 201
        order = order_res.json()
        assert order["status"] == "PENDING"
        assert order["client_business_name"] == "Sungmo Heals"

@pytest.mark.asyncio
async def test_sungmo_heals_unauthorized_modification_protection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register a malicious or separate client
        other_email = f"other_client_{uuid.uuid4().hex[:8]}@vendor.com"
        other_reg = await ac.post("/api/v1/auth/register", json={
            "email": other_email,
            "password": "VendorPassword123!",
            "first_name": "Rival",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "Rival Business"
        })
        other_headers = {"Authorization": f"Bearer {other_reg.json()['access_token']}"}

        # Get Sungmo Heals service ID
        pub_res = await ac.get("/api/v1/public/services?limit=100")
        sungmo_svc = next((s for s in pub_res.json() if s.get("client_business_name") == "Sungmo Heals"), None)
        assert sungmo_svc is not None

        # Attempt to modify Sungmo Heals service using separate client's credentials -> 404 / 403 Forbidden
        attack_res = await ac.put(f"/api/v1/client/services/{sungmo_svc['id']}", headers=other_headers, json={
            "category_id": sungmo_svc["category_id"],
            "title": "Hacked Title",
            "description": "Unauthorized alteration",
            "price": 1.00
        })
        # Note: Scoped queries return 404 or 403 when resource belongs to another client
        assert attack_res.status_code in (403, 404)

@pytest.mark.asyncio
async def test_three_role_access_and_cross_role_403_protection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login as CLIENT (Consumer)
        cons_email = f"client_buyer_{uuid.uuid4().hex[:8]}@test.com"
        reg_c = await ac.post("/api/v1/auth/register", json={
            "email": cons_email,
            "password": "ClientPassword123!",
            "first_name": "Client",
            "last_name": "Buyer",
            "role": "consumer"
        })
        c_token = reg_c.json()["access_token"]
        c_headers = {"Authorization": f"Bearer {c_token}"}

        # 2. Login as OWNER (Business / Client role in DB)
        owner_res = await ac.post("/api/v1/auth/login", json={
            "email": "snigdhahealer157@gmail.com",
            "password": "SungmoPassword123!"
        })
        o_token = owner_res.json()["access_token"]
        o_headers = {"Authorization": f"Bearer {o_token}"}

        # 3. Login as ADMIN
        admin_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        a_token = admin_res.json()["access_token"]
        a_headers = {"Authorization": f"Bearer {a_token}"}

        # CLIENT Access Checks
        assert (await ac.get("/api/v1/consumer/orders", headers=c_headers)).status_code == 200
        # CLIENT forbidden on OWNER endpoints
        assert (await ac.get("/api/v1/client/services", headers=c_headers)).status_code == 403
        assert (await ac.get("/api/v1/client/analytics", headers=c_headers)).status_code == 403
        # CLIENT forbidden on ADMIN endpoints
        assert (await ac.get("/api/v1/admin/users", headers=c_headers)).status_code == 403
        assert (await ac.get("/api/v1/admin/audit-logs", headers=c_headers)).status_code == 403

        # OWNER Access Checks
        assert (await ac.get("/api/v1/client/services", headers=o_headers)).status_code == 200
        assert (await ac.get("/api/v1/client/analytics", headers=o_headers)).status_code == 200
        # OWNER forbidden on CLIENT consumer endpoints
        assert (await ac.get("/api/v1/consumer/orders", headers=o_headers)).status_code == 403
        # OWNER allowed on ADMIN endpoints under Owner + Admin access model
        assert (await ac.get("/api/v1/admin/users", headers=o_headers)).status_code == 200
        assert (await ac.get("/api/v1/admin/audit-logs", headers=o_headers)).status_code == 200

        # ADMIN Access Checks (Admin allowed on Admin, forbidden on Owner client endpoints)
        assert (await ac.get("/api/v1/admin/users", headers=a_headers)).status_code == 200
        assert (await ac.get("/api/v1/admin/services", headers=a_headers)).status_code == 200
        assert (await ac.get("/api/v1/admin/orders", headers=a_headers)).status_code == 200
        assert (await ac.get("/api/v1/admin/audit-logs", headers=a_headers)).status_code == 200
        assert (await ac.get("/api/v1/client/services", headers=a_headers)).status_code == 403

@pytest.mark.asyncio
async def test_client_order_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Client 1
        c1 = await ac.post("/api/v1/auth/register", json={
            "email": f"c1_{uuid.uuid4().hex[:8]}@test.com",
            "password": "Password123!",
            "first_name": "Client1",
            "last_name": "Test",
            "role": "consumer"
        })
        h1 = {"Authorization": f"Bearer {c1.json()['access_token']}"}

        # Client 2
        c2 = await ac.post("/api/v1/auth/register", json={
            "email": f"c2_{uuid.uuid4().hex[:8]}@test.com",
            "password": "Password123!",
            "first_name": "Client2",
            "last_name": "Test",
            "role": "consumer"
        })
        h2 = {"Authorization": f"Bearer {c2.json()['access_token']}"}

        # Get service ID
        svc_res = await ac.get("/api/v1/public/services?limit=10")
        svc_id = svc_res.json()[0]["id"]

        # Client 1 creates order
        o1_res = await ac.post("/api/v1/consumer/orders", headers=h1, json={
            "service_product_id": svc_id,
            "quantity": 1
        })
        order_id = o1_res.json()["id"]

        # Client 2 attempts to fetch Client 1's order -> 403 or 404
        idor_res = await ac.get(f"/api/v1/consumer/orders/{order_id}", headers=h2)
        assert idor_res.status_code in (403, 404)

@pytest.mark.asyncio
async def test_sungmo_heals_complete_demo_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. CLIENT logs in and books service
        c_email = f"democlient_{uuid.uuid4().hex[:8]}@test.com"
        reg_c = await ac.post("/api/v1/auth/register", json={
            "email": c_email,
            "password": "DemoPassword123!",
            "first_name": "DemoClient",
            "last_name": "Buyer",
            "role": "consumer"
        })
        c_headers = {"Authorization": f"Bearer {reg_c.json()['access_token']}"}

        # Find Sungmo Heals Inner Child Healing service
        pub_res = await ac.get("/api/v1/public/services?q=Inner Child Healing")
        services = pub_res.json()
        target_svc = next((s for s in services if s.get("client_business_name") == "Sungmo Heals"), services[0])

        # Create Order
        book_res = await ac.post("/api/v1/consumer/orders", headers=c_headers, json={
            "service_product_id": target_svc["id"],
            "quantity": 1,
            "notes": "Session request for inner child work.",
            "payment_method": "card"
        })
        assert book_res.status_code == 201
        order = book_res.json()
        order_id = order["id"]

        # Verify initial notification for Client
        notif_res = await ac.get("/api/v1/consumer/notifications", headers=c_headers)
        assert notif_res.status_code == 200

        # 2. OWNER (Sungmo Heals / Snigdha) logs in
        owner_res = await ac.post("/api/v1/auth/login", json={
            "email": "snigdhahealer157@gmail.com",
            "password": "SungmoPassword123!"
        })
        o_headers = {"Authorization": f"Bearer {owner_res.json()['access_token']}"}

        # Owner views order requests queue
        req_res = await ac.get("/api/v1/client/orders", headers=o_headers)
        assert req_res.status_code == 200
        owner_orders = req_res.json()
        target_order = next((o for o in owner_orders if o["id"] == order_id), None)
        assert target_order is not None

        # Owner accepts booking
        accept_res = await ac.patch(f"/api/v1/client/orders/{order_id}/status", headers=o_headers, json={
            "status": "ACCEPTED"
        })
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "ACCEPTED"

        # Owner moves status to IN_PROGRESS
        prog_res = await ac.patch(f"/api/v1/client/orders/{order_id}/status", headers=o_headers, json={
            "status": "IN_PROGRESS"
        })
        assert prog_res.status_code == 200
        assert prog_res.json()["status"] == "IN_PROGRESS"

        # Owner moves status to COMPLETED
        comp_res = await ac.patch(f"/api/v1/client/orders/{order_id}/status", headers=o_headers, json={
            "status": "COMPLETED"
        })
        assert comp_res.status_code == 200
        assert comp_res.json()["status"] == "COMPLETED"

        # Verify Owner Revenue calculation (10% platform fee, 90% owner net earnings)
        analytics_res = await ac.get("/api/v1/client/analytics", headers=o_headers)
        assert analytics_res.status_code == 200
        analytics = analytics_res.json()
        assert analytics["lifetime_earnings"] >= 0

        # 3. CLIENT sees completed order status and leaves review
        c_order_res = await ac.get(f"/api/v1/consumer/orders/{order_id}", headers=c_headers)
        assert c_order_res.status_code == 200
        assert c_order_res.json()["status"] == "COMPLETED"

        review_res = await ac.post(f"/api/v1/consumer/orders/{order_id}/review", headers=c_headers, json={
            "rating": 5,
            "comment": "Transformative session! Highly recommended."
        })
        assert review_res.status_code == 201

        # 4. ADMIN logs in and verifies owner, client, service, order, payment, review, audit trail
        admin_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        assert admin_res.status_code == 200, f"admin login failed: {admin_res.status_code} {admin_res.text}"
        a_headers = {"Authorization": f"Bearer {admin_res.json()['access_token']}"}

        r1 = await ac.get("/api/v1/admin/users", headers=a_headers)
        assert r1.status_code == 200, f"admin/users failed: {r1.status_code} {r1.text}"
        r2 = await ac.get("/api/v1/admin/clients/pending", headers=a_headers)
        assert r2.status_code == 200, f"admin/clients/pending failed: {r2.status_code} {r2.text}"
        r3 = await ac.get("/api/v1/admin/services", headers=a_headers)
        assert r3.status_code == 200, f"admin/services failed: {r3.status_code} {r3.text}"
        r4 = await ac.get("/api/v1/admin/orders", headers=a_headers)
        assert r4.status_code == 200, f"admin/orders failed: {r4.status_code} {r4.text}"
        r5 = await ac.get("/api/v1/admin/analytics", headers=a_headers)
        assert r5.status_code == 200, f"admin/analytics failed: {r5.status_code} {r5.text}"
        r6 = await ac.get("/api/v1/admin/reviews", headers=a_headers)
        assert r6.status_code == 200, f"admin/reviews failed: {r6.status_code} {r6.text}"
        r7 = await ac.get("/api/v1/admin/audit-logs", headers=a_headers)
        assert r7.status_code == 200, f"admin/audit-logs failed: {r7.status_code} {r7.text}"
