import random
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import settings
from app.models.models import (
    User, ConsumerProfile, ServiceProduct, Order, OrderItem, Payment, Review, Notification
)
from app.schemas.schemas import (
    ConsumerProfileResponse, ConsumerProfileUpdate, OrderCreateRequest,
    OrderResponse, ReviewCreate, ReviewResponse, NotificationResponse
)
from app.core.dependencies import require_roles
from app.core.finance import calculate_financial_split
from app.core.payment_provider import payment_provider
from app.services.notification_service import NotificationEvents

router = APIRouter(prefix="/consumer", tags=["Consumer Portal"])
consumer_guard = require_roles(["consumer"])

def build_consumer_profile_response(profile: ConsumerProfile, user: User) -> ConsumerProfileResponse:
    return ConsumerProfileResponse(
        id=profile.id,
        avatar_url=profile.avatar_url,
        address_line1=profile.address_line1,
        city=profile.city,
        postal_code=profile.postal_code,
        country=profile.country,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone
    )

@router.get("/profile", response_model=ConsumerProfileResponse)
async def get_profile(
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ConsumerProfile).where(ConsumerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = ConsumerProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return build_consumer_profile_response(profile, current_user)

@router.put("/profile", response_model=ConsumerProfileResponse)
async def update_profile(
    req: ConsumerProfileUpdate,
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ConsumerProfile).where(ConsumerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = ConsumerProfile(user_id=current_user.id)
        db.add(profile)

    if req.avatar_url is not None:
        profile.avatar_url = req.avatar_url
    if req.address_line1 is not None:
        profile.address_line1 = req.address_line1
    if req.city is not None:
        profile.city = req.city
    if req.postal_code is not None:
        profile.postal_code = req.postal_code
    if req.country is not None:
        profile.country = req.country

    if req.first_name is not None and req.first_name.strip():
        current_user.first_name = req.first_name.strip()
    if req.last_name is not None and req.last_name.strip():
        current_user.last_name = req.last_name.strip()
    if req.phone is not None:
        current_user.phone = req.phone.strip() if req.phone else None

    await db.commit()
    await db.refresh(profile)
    await db.refresh(current_user)
    return build_consumer_profile_response(profile, current_user)

@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    req: OrderCreateRequest,
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch Service/Product
    svc_result = await db.execute(
        select(ServiceProduct)
        .options(selectinload(ServiceProduct.client))
        .where(ServiceProduct.id == req.service_product_id)
    )
    service = svc_result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service or product not found")

    if not service.is_available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This service is currently unavailable.")

    if not service.client or service.client.approval_status != "APPROVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Service provider is not currently accepting orders.")

    # 2. Compute Financials using Centralized Financial Engine
    gross_total = Decimal(str(service.price)) * req.quantity
    fin_split = calculate_financial_split(gross_total)
    total_amount = fin_split["total_amount"]
    platform_fee = fin_split["platform_fee"]
    client_earnings = fin_split["client_earnings"]

    # 3. Generate Order Number
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    order_number = f"ORD-{date_str}-{unique_suffix}"

    # 4. Create Order entity
    order = Order(
        order_number=order_number,
        consumer_id=current_user.id,
        client_id=service.client_id,
        status="PENDING",
        total_amount=total_amount,
        platform_fee=platform_fee,
        client_earnings=client_earnings,
        scheduled_at=req.scheduled_at,
        notes=req.notes
    )
    db.add(order)
    await db.flush()

    # 5. Create Order Item snapshot
    item = OrderItem(
        order_id=order.id,
        service_product_id=service.id,
        unit_price=service.price,
        quantity=req.quantity,
        item_title=service.title
    )
    db.add(item)

    # 6. Initiate Payment via Payment Provider Abstraction
    pay_intent = await payment_provider.initiate_payment(
        order_id=order.id,
        amount=total_amount,
        currency="USD",
        payment_method=req.payment_method
    )

    payment = Payment(
        order_id=order.id,
        transaction_id=pay_intent["transaction_id"],
        amount=total_amount,
        currency=pay_intent.get("currency", "USD"),
        status=pay_intent.get("status", "SUCCEEDED"),
        payment_method=req.payment_method
    )
    db.add(payment)

    # 7. Centralized Notification Dispatch
    await NotificationEvents.order_created(
        db=db,
        client_user_id=service.client.user_id,
        consumer_user_id=current_user.id,
        order_number=order_number,
        service_title=service.title,
        consumer_name=f"{current_user.first_name} {current_user.last_name}"
    )

    await db.commit()

    return await get_order_by_id(order.id, current_user.id, db)

async def get_order_by_id(order_id: str, consumer_id: str, db: AsyncSession) -> OrderResponse:
    query = (
        select(Order)
        .options(
            selectinload(Order.client),
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.review),
            selectinload(Order.consumer)
        )
        .where(Order.id == order_id, Order.consumer_id == consumer_id)
    )
    result = await db.execute(query)
    o = result.unique().scalar_one_or_none()
    if not o:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    return OrderResponse(
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
        client_business_name=o.client.business_name if o.client else None,
        consumer_name=f"{o.consumer.first_name} {o.consumer.last_name}" if o.consumer else None,
        consumer_email=o.consumer.email if o.consumer else None,
        items=o.items,
        payment=o.payment,
        review=o.review
    )

@router.get("/orders", response_model=List[OrderResponse])
async def list_orders(
    status_filter: Optional[str] = None,
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Order)
        .options(
            selectinload(Order.client),
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.review),
            selectinload(Order.consumer)
        )
        .where(Order.consumer_id == current_user.id)
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
            client_business_name=o.client.business_name if o.client else None,
            consumer_name=f"{o.consumer.first_name} {o.consumer.last_name}" if o.consumer else None,
            consumer_email=o.consumer.email if o.consumer else None,
            items=o.items,
            payment=o.payment,
            review=o.review
        )
        for o in orders
    ]

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: str,
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    return await get_order_by_id(order_id, current_user.id, db)

@router.get("/orders/{order_id}/receipt")
async def get_order_receipt(
    order_id: str,
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Order)
        .options(
            selectinload(Order.client),
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.consumer)
        )
        .where(Order.id == order_id, Order.consumer_id == current_user.id)
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
            "name": f"{o.consumer.first_name} {o.consumer.last_name}",
            "email": o.consumer.email
        },
        "provider_business_name": o.client.business_name if o.client else "N/A",
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

@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str,
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order).options(selectinload(Order.payment)).where(Order.id == order_id, Order.consumer_id == current_user.id)
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status not in ["PENDING"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status '{order.status}'."
        )

    order.status = "CANCELLED"
    order.rejection_reason = "Cancelled by consumer"

    # If payment exists, update payment status to REFUNDED via payment_provider
    if order.payment and order.payment.status == "SUCCEEDED":
        ref_res = await payment_provider.refund_payment(order.payment.transaction_id, order.total_amount)
        order.payment.status = ref_res.get("status", "REFUNDED")

    await db.commit()

    return await get_order_by_id(order.id, current_user.id, db)

@router.post("/orders/{order_id}/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def submit_review(
    order_id: str,
    req: ReviewCreate,
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rating must be between 1 and 5.")

    # Order must exist and belong to consumer
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.client))
        .where(Order.id == order_id, Order.consumer_id == current_user.id)
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviews can only be submitted for completed orders."
        )

    # Check if already reviewed
    rev_check = await db.execute(select(Review).where(Review.order_id == order.id))
    if rev_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has already been reviewed.")

    review = Review(
        order_id=order.id,
        client_id=order.client_id,
        consumer_id=current_user.id,
        rating=req.rating,
        comment=req.comment
    )
    db.add(review)

    # Dispatch review notification to provider
    if order.client and order.client.user_id:
        await NotificationEvents.review_submitted(
            db=db,
            client_user_id=order.client.user_id,
            consumer_name=f"{current_user.first_name} {current_user.last_name}",
            order_number=order.order_number,
            rating=req.rating
        )

    await db.commit()
    await db.refresh(review)
    return review

@router.get("/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(consumer_guard),
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
async def mark_notification_read(
    notif_id: str,
    current_user: User = Depends(consumer_guard),
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

@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(consumer_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.recipient_id == current_user.id,
            Notification.is_read == False
        )
    )
    notifications = result.scalars().all()
    for n in notifications:
        n.is_read = True
    await db.commit()
    return {"message": "All notifications marked as read"}
