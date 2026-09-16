import uuid
import pytest
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.finance import calculate_financial_split
from app.core.payment_provider import payment_provider

@pytest.mark.asyncio
async def test_phase6_financial_engine_and_payment_provider_abstraction():
    # 1. Financial calculation precision
    split1 = calculate_financial_split(Decimal("100.00"))
    assert split1["total_amount"] == Decimal("100.00")
    assert split1["platform_fee"] == Decimal("10.00")
    assert split1["client_earnings"] == Decimal("90.00")

    split2 = calculate_financial_split(Decimal("249.99"))
    assert split2["total_amount"] == Decimal("249.99")
    assert split2["platform_fee"] == Decimal("25.00")
    assert split2["client_earnings"] == Decimal("224.99")

    # 2. Payment Provider Abstraction
    intent = await payment_provider.initiate_payment(
        order_id="test_ord_123",
        amount=Decimal("150.00"),
        currency="USD",
        payment_method="credit_card"
    )
    assert intent["status"] == "SUCCEEDED"
    assert intent["transaction_id"].startswith("tx_test_")

    # Server-side verification
    is_valid = await payment_provider.verify_payment(
        transaction_id=intent["transaction_id"],
        payload={"order_id": "test_ord_123", "amount": Decimal("150.00"), "currency": "USD"},
        signature=intent["signature"]
    )
    assert is_valid is True

    # Refund processing
    refund = await payment_provider.refund_payment(intent["transaction_id"], Decimal("150.00"))
    assert refund["status"] == "REFUNDED"
    assert refund["refund_id"].startswith("ref_test_")

@pytest.mark.asyncio
async def test_phase6_order_payment_lifecycle_and_refunds():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # 1. Register and approve Client
        client_res = await ac.post("/api/v1/auth/register", json={
            "email": f"client_p6_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "Pay",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "Payment Lifecycle Solutions"
        })
        client_token = client_res.json()["access_token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        prof = (await ac.get("/api/v1/client/profile", headers=client_headers)).json()
        await ac.patch(f"/api/v1/admin/clients/{prof['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        # Category & Service
        cat_id = (await ac.get("/api/v1/public/categories")).json()[0]["id"]
        svc = (await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": cat_id,
            "title": "Full Refundable Advisory",
            "description": "Advisory service with full refund guarantee",
            "price": 500.00
        })).json()

        # 2. Consumer registers and places order
        consumer_res = await ac.post("/api/v1/auth/register", json={
            "email": f"consumer_p6_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Refund",
            "last_name": "Buyer",
            "role": "consumer"
        })
        consumer_token = consumer_res.json()["access_token"]
        consumer_headers = {"Authorization": f"Bearer {consumer_token}"}

        order = (await ac.post("/api/v1/consumer/orders", headers=consumer_headers, json={
            "service_product_id": svc["id"],
            "quantity": 1
        })).json()

        assert order["payment"]["status"] == "SUCCEEDED"
        assert float(order["total_amount"]) == 500.00
        assert float(order["platform_fee"]) == 50.00
        assert float(order["client_earnings"]) == 450.00

        # 3. Consumer cancels order -> refund processed
        cancel_res = await ac.post(f"/api/v1/consumer/orders/{order['id']}/cancel", headers=consumer_headers)
        assert cancel_res.status_code == 200
        cancelled_order = cancel_res.json()
        assert cancelled_order["status"] == "CANCELLED"
        assert cancelled_order["payment"]["status"] == "REFUNDED"

@pytest.mark.asyncio
async def test_phase6_notifications_and_ownership_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Setup Client
        client_res = await ac.post("/api/v1/auth/register", json={
            "email": f"notif_client_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "Notif",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "Notification Vendor Services"
        })
        client_token = client_res.json()["access_token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        prof = (await ac.get("/api/v1/client/profile", headers=client_headers)).json()
        await ac.patch(f"/api/v1/admin/clients/{prof['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        cat_id = (await ac.get("/api/v1/public/categories")).json()[0]["id"]
        svc = (await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": cat_id,
            "title": "Notification Target Service",
            "description": "Testing notification dispatch",
            "price": 100.00
        })).json()

        # Consumer A
        cA_res = await ac.post("/api/v1/auth/register", json={
            "email": f"notif_consA_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Consumer",
            "last_name": "A",
            "role": "consumer"
        })
        cTokenA = cA_res.json()["access_token"]
        cHeadersA = {"Authorization": f"Bearer {cTokenA}"}

        # Consumer B
        cB_res = await ac.post("/api/v1/auth/register", json={
            "email": f"notif_consB_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Consumer",
            "last_name": "B",
            "role": "consumer"
        })
        cTokenB = cB_res.json()["access_token"]
        cHeadersB = {"Authorization": f"Bearer {cTokenB}"}

        # Consumer A places order
        await ac.post("/api/v1/consumer/orders", headers=cHeadersA, json={
            "service_product_id": svc["id"],
            "quantity": 1
        })

        # Consumer A checks notifications
        notifsA = (await ac.get("/api/v1/consumer/notifications", headers=cHeadersA)).json()
        assert len(notifsA) > 0
        assert "Booking Request Submitted" in [n["title"] for n in notifsA]

        # Consumer B checks notifications -> Consumer B must not see Consumer A's notifications
        notifsB = (await ac.get("/api/v1/consumer/notifications", headers=cHeadersB)).json()
        assert len(notifsB) == 0

        # Mark all read for Consumer A
        read_all = await ac.patch("/api/v1/consumer/notifications/read-all", headers=cHeadersA)
        assert read_all.status_code == 200

@pytest.mark.asyncio
async def test_phase6_review_hardening_and_receipt_generation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@nexuscore.com",
            "password": "AdminPassword123!"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Setup Client
        client_res = await ac.post("/api/v1/auth/register", json={
            "email": f"rev_client_{uuid.uuid4().hex[:8]}@vendor.com",
            "password": "VendorPassword123!",
            "first_name": "Rev",
            "last_name": "Vendor",
            "role": "client",
            "business_name": "Review Hardening Enterprise"
        })
        client_token = client_res.json()["access_token"]
        client_headers = {"Authorization": f"Bearer {client_token}"}
        prof = (await ac.get("/api/v1/client/profile", headers=client_headers)).json()
        await ac.patch(f"/api/v1/admin/clients/{prof['id']}/approval", headers=admin_headers, json={"approval_status": "APPROVED"})

        cat_id = (await ac.get("/api/v1/public/categories")).json()[0]["id"]
        svc = (await ac.post("/api/v1/client/services", headers=client_headers, json={
            "category_id": cat_id,
            "title": "Review Target Service",
            "description": "Service for review validation testing",
            "price": 300.00
        })).json()

        # Consumer
        consumer_res = await ac.post("/api/v1/auth/register", json={
            "email": f"rev_cons_{uuid.uuid4().hex[:8]}@test.com",
            "password": "ConsumerPassword123!",
            "first_name": "Reviewer",
            "last_name": "Consumer",
            "role": "consumer"
        })
        consumer_token = consumer_res.json()["access_token"]
        consumer_headers = {"Authorization": f"Bearer {consumer_token}"}

        order = (await ac.post("/api/v1/consumer/orders", headers=consumer_headers, json={
            "service_product_id": svc["id"],
            "quantity": 1
        })).json()

        # 1. Attempt review on PENDING order -> 400 Bad Request
        rev_fail1 = await ac.post(f"/api/v1/consumer/orders/{order['id']}/review", headers=consumer_headers, json={
            "rating": 5, "comment": "Premature review"
        })
        assert rev_fail1.status_code == 400

        # 2. Attempt invalid rating (6) -> 400 or 422
        rev_fail2 = await ac.post(f"/api/v1/consumer/orders/{order['id']}/review", headers=consumer_headers, json={
            "rating": 6, "comment": "Invalid rating"
        })
        assert rev_fail2.status_code in [400, 422]

        # 3. Client progresses order to COMPLETED
        await ac.patch(f"/api/v1/client/orders/{order['id']}/status", headers=client_headers, json={"status": "ACCEPTED"})
        await ac.patch(f"/api/v1/client/orders/{order['id']}/status", headers=client_headers, json={"status": "IN_PROGRESS"})
        await ac.patch(f"/api/v1/client/orders/{order['id']}/status", headers=client_headers, json={"status": "COMPLETED"})

        # 4. Now submit valid review
        rev_ok = await ac.post(f"/api/v1/consumer/orders/{order['id']}/review", headers=consumer_headers, json={
            "rating": 5, "comment": "Outstanding service delivery!"
        })
        assert rev_ok.status_code == 201

        # 5. Attempt duplicate review -> 400 Bad Request
        rev_dup = await ac.post(f"/api/v1/consumer/orders/{order['id']}/review", headers=consumer_headers, json={
            "rating": 5, "comment": "Duplicate review attempt"
        })
        assert rev_dup.status_code == 400

        # 6. Verify client received review notification
        client_notifs = (await ac.get("/api/v1/client/notifications", headers=client_headers)).json()
        assert any("Review Received" in n["title"] for n in client_notifs)

        # 7. Receipt generation verification
        rec_res = await ac.get(f"/api/v1/consumer/orders/{order['id']}/receipt", headers=consumer_headers)
        assert rec_res.status_code == 200
        receipt = rec_res.json()
        assert receipt["receipt_number"] == f"REC-{order['order_number']}"
        assert receipt["financial_summary"]["gross_amount"] == 300.00
        assert receipt["financial_summary"]["platform_fee"] == 30.00
        assert receipt["financial_summary"]["client_net_earnings"] == 270.00
