from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import settings
from app.models.models import (
    User, ClientProfile, ServiceProduct, Category, Order, Notification, Review, Payment
)
from app.schemas.schemas import (
    ClientProfileResponse, ClientProfileUpdate, ServiceProductCreate,
    ServiceProductUpdate, ServiceProductResponse, OrderStatusUpdate,
    OrderResponse, ReviewResponse, ClientCustomerResponse, NotificationResponse, PaymentResponse
)
from app.core.dependencies import require_roles
from app.core.payment_provider import payment_provider
from app.services.notification_service import NotificationEvents

router = APIRouter(prefix="/client", tags=["Client & Business Portal"])
client_guard = require_roles(["client"])

async def get_client_profile(user: User, db: AsyncSession) -> ClientProfile:
    result = await db.execute(
        select(ClientProfile).where(ClientProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found. Please complete business onboarding."
        )
    return profile

def build_client_profile_response(profile: ClientProfile, user: User) -> ClientProfileResponse:
    return ClientProfileResponse(
        id=profile.id,
        business_name=profile.business_name,
        business_registration_no=profile.business_registration_no,
        bio=profile.bio,
        logo_url=profile.logo_url,
        service_area=profile.service_area,
        approval_status=profile.approval_status,
        rejection_reason=profile.rejection_reason,
        available_balance=profile.available_balance,
        created_at=profile.created_at,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone
    )

@router.get("/profile", response_model=ClientProfileResponse)
async def get_profile(
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)
    return build_client_profile_response(profile, current_user)

@router.put("/profile", response_model=ClientProfileResponse)
async def update_profile(
    req: ClientProfileUpdate,
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)

    if req.business_name is not None:
        profile.business_name = req.business_name.strip()
    if req.business_registration_no is not None:
        profile.business_registration_no = req.business_registration_no
    if req.bio is not None:
        profile.bio = req.bio
    if req.logo_url is not None:
        profile.logo_url = req.logo_url
    if req.service_area is not None:
        profile.service_area = req.service_area

    if req.first_name is not None and req.first_name.strip():
        current_user.first_name = req.first_name.strip()
    if req.last_name is not None and req.last_name.strip():
        current_user.last_name = req.last_name.strip()
    if req.phone is not None:
        current_user.phone = req.phone.strip() if req.phone else None

    await db.commit()
    await db.refresh(profile)
    await db.refresh(current_user)
    return build_client_profile_response(profile, current_user)

@router.get("/services", response_model=List[ServiceProductResponse])
async def list_services(
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)
    query = (
        select(ServiceProduct)
        .options(selectinload(ServiceProduct.category))
        .where(ServiceProduct.client_id == profile.id)
        .order_by(ServiceProduct.created_at.desc())
    )
    result = await db.execute(query)
    services = result.scalars().all()

    return [
        ServiceProductResponse(
            id=s.id,
            client_id=s.client_id,
            category_id=s.category_id,
            title=s.title,
            description=s.description,
            price=s.price,
            duration_minutes=s.duration_minutes,
            is_available=s.is_available,
            image_urls=s.image_urls or [],
            category=s.category,
            client_business_name=profile.business_name,
            created_at=s.created_at
        )
        for s in services
    ]

@router.post("/services", response_model=ServiceProductResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    req: ServiceProductCreate,
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)
    if profile.approval_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Client account must be APPROVED before creating service offerings (current status: {profile.approval_status})."
        )
    
    # Check category exists
    cat = await db.execute(select(Category).where(Category.id == req.category_id))
    if not cat.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    # Auto-detect test fixture services if flag set or if title contains test keywords
    is_fixture = req.is_test_fixture
    if not is_fixture:
        title_lower = req.title.lower()
        test_keywords = ["test", "idor", "target", "governance", "fixture", "exclusive", "advisory"]
        if any(k in title_lower for k in test_keywords):
            is_fixture = True

    service = ServiceProduct(
        client_id=profile.id,
        category_id=req.category_id,
        title=req.title.strip(),
        description=req.description.strip(),
        price=req.price,
        duration_minutes=req.duration_minutes,
        is_available=req.is_available,
        is_test_fixture=is_fixture,
        image_urls=req.image_urls
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)

    # Load category
    cat_res = await db.execute(select(Category).where(Category.id == service.category_id))
    category = cat_res.scalar_one_or_none()

    return ServiceProductResponse(
        id=service.id,
        client_id=service.client_id,
        category_id=service.category_id,
        title=service.title,
        description=service.description,
        price=service.price,
        duration_minutes=service.duration_minutes,
        is_available=service.is_available,
        is_test_fixture=service.is_test_fixture,
        image_urls=service.image_urls or [],
        category=category,
        client_business_name=profile.business_name,
        client_bio=profile.bio,
        client_service_area=profile.service_area,
        client_logo_url=profile.logo_url,
        created_at=service.created_at
    )

@router.put("/services/{service_id}", response_model=ServiceProductResponse)
async def update_service(
    service_id: str,
    req: ServiceProductUpdate,
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)
    if profile.approval_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client account must be APPROVED to modify service offerings."
        )
    query = (
        select(ServiceProduct)
        .options(selectinload(ServiceProduct.category))
        .where(ServiceProduct.id == service_id, ServiceProduct.client_id == profile.id)
    )
    result = await db.execute(query)
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    if req.category_id is not None:
        cat = await db.execute(select(Category).where(Category.id == req.category_id))
        if not cat.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")
        service.category_id = req.category_id

    if req.title is not None:
        service.title = req.title.strip()
    if req.description is not None:
        service.description = req.description.strip()
    if req.price is not None:
        service.price = req.price
    if req.duration_minutes is not None:
        service.duration_minutes = req.duration_minutes
    if req.is_available is not None:
        service.is_available = req.is_available
    if req.is_test_fixture is not None:
        service.is_test_fixture = req.is_test_fixture
    if req.image_urls is not None:
        service.image_urls = req.image_urls

    await db.commit()
    await db.refresh(service)

    return ServiceProductResponse(
        id=service.id,
        client_id=service.client_id,
        category_id=service.category_id,
        title=service.title,
        description=service.description,
        price=service.price,
        duration_minutes=service.duration_minutes,
        is_available=service.is_available,
        is_test_fixture=service.is_test_fixture,
        image_urls=service.image_urls or [],
        category=service.category,
        client_business_name=profile.business_name,
        client_bio=profile.bio,
        client_service_area=profile.service_area,
        client_logo_url=profile.logo_url,
        created_at=service.created_at
    )

@router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)
    if profile.approval_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client account must be APPROVED to delete service offerings."
        )
    result = await db.execute(
        select(ServiceProduct).where(
            ServiceProduct.id == service_id,
            ServiceProduct.client_id == profile.id
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    await db.delete(service)
    await db.commit()
    return {"message": "Service successfully removed"}

@router.get("/orders", response_model=List[OrderResponse])
async def list_client_orders(
    status_filter: Optional[str] = None,
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)
    query = (
        select(Order)
        .options(
            selectinload(Order.client),
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.review),
            selectinload(Order.consumer)
        )
        .where(Order.client_id == profile.id)
        .order_by(Order.created_at.desc())
    )
    if status_filter:
        query = query.where(Order.status == status_filter.upper())

    result = await db.execute(query)
    orders = result.unique().scalars().all()

    return [
        OrderResponse(
            id=o.id,
            order_number=o.order_number,
            consumer_id=o.consumer_id,
            client_id=o.client_id,
            status=o.status,
            total_amount=o.total_amount,
            platform_fee=o.platform_fee,
            client_earnings=o.client_earnings,
            scheduled_at=o.scheduled_at,
            notes=o.notes,
            rejection_reason=o.rejection_reason,
            created_at=o.created_at,
            updated_at=o.updated_at,
            client_business_name=profile.business_name,
            consumer_name=f"{o.consumer.first_name} {o.consumer.last_name}" if o.consumer else None,
            consumer_email=o.consumer.email if o.consumer else None,
            items=o.items,
            payment=o.payment,
            review=o.review
        )
        for o in orders
    ]

@router.get("/orders/{order_id}/receipt")
async def get_client_order_receipt(
    order_id: str,
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)
    query = (
        select(Order)
        .options(
            selectinload(Order.client),
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.consumer)
        )
        .where(Order.id == order_id, Order.client_id == profile.id)
    )
    result = await db.execute(query)
    o = result.unique().scalar_one_or_none()
    if not o:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    p = o.payment
    return {
        "platform": settings.PROJECT_NAME,
        "receipt_number": f"REC-{o.order_number}",
        "order_id": o.id,
        "order_number": o.order_number,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "consumer": {
            "name": f"{o.consumer.first_name} {o.consumer.last_name}" if o.consumer else "Consumer",
            "email": o.consumer.email if o.consumer else "N/A"
        },
        "provider_business_name": profile.business_name,
        "items": [
            {
                "title": item.item_title,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "subtotal": float(item.unit_price * item.quantity)
            }
            for item in o.items
        ],
        "financial_summary": {
            "gross_amount": float(o.total_amount),
            "platform_fee": float(o.platform_fee),
            "client_net_earnings": float(o.client_earnings),
            "currency": p.currency if p else "USD"
        },
        "payment_details": {
            "status": p.status if p else "UNPAID",
            "transaction_id": p.transaction_id if p else None,
            "payment_method": p.payment_method if p else "card"
        }
    }

@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    req: OrderStatusUpdate,
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)
    query = (
        select(Order)
        .options(
            selectinload(Order.client),
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.review),
            selectinload(Order.consumer)
        )
        .where(Order.id == order_id, Order.client_id == profile.id)
    )
    result = await db.execute(query)
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # State machine transition enforcement
    valid_transitions = {
        "PENDING": ["ACCEPTED", "REJECTED"],
        "ACCEPTED": ["IN_PROGRESS", "CANCELLED"],
        "IN_PROGRESS": ["COMPLETED"],
        "COMPLETED": [],
        "REJECTED": [],
        "CANCELLED": []
    }

    if req.status not in valid_transitions.get(order.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition from '{order.status}' to '{req.status}'."
        )

    order.status = req.status
    if req.status == "REJECTED":
        order.rejection_reason = req.rejection_reason or "Declined by service provider."

    # If status is REJECTED or CANCELLED, process payment refund if succeeded
    if req.status in ["REJECTED", "CANCELLED"] and order.payment and order.payment.status == "SUCCEEDED":
        ref_res = await payment_provider.refund_payment(order.payment.transaction_id, order.total_amount)
        order.payment.status = ref_res.get("status", "REFUNDED")

    # If completed, credit client balance
    if req.status == "COMPLETED":
        profile.available_balance += order.client_earnings

    # Send Notification to Consumer via NotificationEvents
    service_title = order.items[0].item_title if order.items else "Service"
    await NotificationEvents.order_status_changed(
        db=db,
        consumer_user_id=order.consumer_id,
        order_number=order.order_number,
        service_title=service_title,
        new_status=req.status,
        reason=order.rejection_reason
    )

    await db.commit()
    await db.refresh(order)

    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        consumer_id=order.consumer_id,
        client_id=order.client_id,
        status=order.status,
        total_amount=order.total_amount,
        platform_fee=order.platform_fee,
        client_earnings=order.client_earnings,
        scheduled_at=order.scheduled_at,
        notes=order.notes,
        rejection_reason=order.rejection_reason,
        created_at=order.created_at,
        updated_at=order.updated_at,
        client_business_name=profile.business_name,
        consumer_name=f"{order.consumer.first_name} {order.consumer.last_name}" if order.consumer else None,
        consumer_email=order.consumer.email if order.consumer else None,
        items=order.items,
        payment=order.payment,
        review=order.review
    )

@router.get("/analytics")
async def get_analytics(
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)

    # Orders count
    orders_res = await db.execute(
        select(Order.status, func.count(Order.id), func.coalesce(func.sum(Order.client_earnings), 0))
        .where(Order.client_id == profile.id)
        .group_by(Order.status)
    )
    rows = orders_res.all()

    total_orders = sum(r[1] for r in rows)
    completed_orders = sum(r[1] for r in rows if r[0] == "COMPLETED")
    pending_orders = sum(r[1] for r in rows if r[0] == "PENDING")
    in_progress_orders = sum(r[1] for r in rows if r[0] == "IN_PROGRESS")
    lifetime_earnings = sum(r[2] for r in rows if r[0] == "COMPLETED")

    # Reviews & Average Rating
    rev_res = await db.execute(
        select(func.count(Review.id), func.coalesce(func.avg(Review.rating), 0))
        .where(Review.client_id == profile.id)
    )
    rev_row = rev_res.one()
    total_reviews = rev_row[0]
    avg_rating = round(float(rev_row[1]), 1)

    return {
        "business_name": profile.business_name,
        "approval_status": profile.approval_status,
        "available_balance": float(profile.available_balance),
        "lifetime_earnings": float(lifetime_earnings),
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "pending_orders": pending_orders,
        "in_progress_orders": in_progress_orders,
        "total_reviews": total_reviews,
        "average_rating": avg_rating
    }

@router.get("/customers", response_model=List[ClientCustomerResponse])
async def list_client_customers(
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)

    query = (
        select(Order)
        .options(selectinload(Order.consumer))
        .where(Order.client_id == profile.id)
        .order_by(Order.created_at.desc())
    )
    result = await db.execute(query)
    orders = result.unique().scalars().all()

    customer_map = {}
    for o in orders:
        if not o.consumer:
            continue
        c_id = o.consumer_id
        total_amt = Decimal(str(o.total_amount))
        if c_id not in customer_map:
            customer_map[c_id] = {
                "id": c_id,
                "name": f"{o.consumer.first_name} {o.consumer.last_name}",
                "email": o.consumer.email,
                "phone": o.consumer.phone,
                "total_orders": 1,
                "total_spent": total_amt,
                "last_order_date": o.created_at,
            }
        else:
            customer_map[c_id]["total_orders"] += 1
            customer_map[c_id]["total_spent"] += total_amt
            if o.created_at > customer_map[c_id]["last_order_date"]:
                customer_map[c_id]["last_order_date"] = o.created_at

    return [ClientCustomerResponse(**c) for c in customer_map.values()]

@router.get("/payments", response_model=List[PaymentResponse])
async def list_client_payments(
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    profile = await get_client_profile(current_user, db)

    query = (
        select(Payment)
        .join(Order, Payment.order_id == Order.id)
        .where(Order.client_id == profile.id)
        .order_by(Payment.created_at.desc())
    )
    result = await db.execute(query)
    payments = result.scalars().all()
    return payments

@router.get("/notifications", response_model=List[NotificationResponse])
async def list_client_notifications(
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()

@router.patch("/notifications/{notif_id}/read")
async def mark_client_notification_read(
    notif_id: str,
    current_user: User = Depends(client_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.recipient_id == current_user.id
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}

