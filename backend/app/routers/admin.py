from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import settings
from app.models.models import (
    User, ClientProfile, ConsumerProfile, Role, Order, Category, AuditLog, Review, ServiceProduct, Notification, Payment
)
from app.schemas.schemas import (
    UserResponse, UserStatusUpdate, ClientApprovalUpdate, ClientProfileResponse,
    AdminAnalyticsResponse, AuditLogResponse, CategoryCreate, CategoryResponse,
    OrderResponse, NotificationResponse
)
from app.core.dependencies import require_roles
from app.core.payment_provider import payment_provider
from app.services.notification_service import NotificationEvents

router = APIRouter(prefix="/admin", tags=["Admin Portal & Platform Governance"])
admin_guard = require_roles(["admin", "client"])

async def log_audit_action(
    db: AsyncSession,
    actor_id: str,
    action: str,
    target_entity: str,
    target_id: str,
    details: dict = None
):
    audit = AuditLog(
        actor_id=actor_id,
        action=action,
        target_entity=target_entity,
        target_id=target_id,
        details=details or {}
    )
    db.add(audit)

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(User)
        .options(
            selectinload(User.role),
            selectinload(User.consumer_profile),
            selectinload(User.client_profile)
        )
        .order_by(User.created_at.desc())
    )
    if role_filter:
        query = query.join(Role).where(Role.name == role_filter.lower())
    if status_filter:
        query = query.where(User.status == status_filter.upper())
    if q:
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    return [
        UserResponse(
            id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            phone=u.phone,
            role=u.role.name if u.role else "consumer",
            status=u.status,
            created_at=u.created_at,
            consumer_profile=u.consumer_profile,
            client_profile=u.client_profile
        )
        for u in users
    ]

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    req: UserStatusUpdate,
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    old_status = user.status
    user.status = req.status

    await log_audit_action(
        db=db,
        actor_id=current_user.id,
        action=f"USER_STATUS_CHANGE_{req.status}",
        target_entity="User",
        target_id=user.id,
        details={"previous_status": old_status, "new_status": req.status, "reason": req.reason}
    )

    await db.commit()
    return {"message": f"User status updated from {old_status} to {req.status}"}

@router.get("/clients/pending", response_model=List[ClientProfileResponse])
async def list_pending_clients(
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ClientProfile)
        .where(ClientProfile.approval_status == "PENDING_APPROVAL")
        .order_by(ClientProfile.created_at.asc())
    )
    return result.scalars().all()

@router.patch("/clients/{client_id}/approval", response_model=ClientProfileResponse)
async def review_client_approval(
    client_id: str,
    req: ClientApprovalUpdate,
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ClientProfile).where(ClientProfile.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client profile not found")

    client.approval_status = req.approval_status
    if req.approval_status == "REJECTED":
        client.rejection_reason = req.rejection_reason or "Business documentation could not be verified."
    else:
        client.rejection_reason = None

    await log_audit_action(
        db=db,
        actor_id=current_user.id,
        action=f"CLIENT_APPROVAL_{req.approval_status}",
        target_entity="ClientProfile",
        target_id=client.id,
        details={"approval_status": req.approval_status, "rejection_reason": client.rejection_reason}
    )

    await db.commit()
    await db.refresh(client)
    return client

@router.get("/orders", response_model=List[OrderResponse])
async def list_all_orders(
    status_filter: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(admin_guard),
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
        .order_by(Order.created_at.desc())
    )
    if status_filter:
        query = query.where(Order.status == status_filter.upper())

    query = query.offset(offset).limit(limit)
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

@router.get("/orders/{order_id}/receipt")
async def get_admin_order_receipt(
    order_id: str,
    current_user: User = Depends(admin_guard),
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
        .where(Order.id == order_id)
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

@router.patch("/orders/{order_id}/cancel", response_model=OrderResponse)
async def admin_cancel_order(
    order_id: str,
    reason: Optional[str] = Query("Administrative cancellation"),
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.client),
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.review),
            selectinload(Order.consumer)
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    old_status = order.status
    order.status = "CANCELLED"
    order.rejection_reason = reason

    # Refund payment if exists and succeeded
    if order.payment and order.payment.status == "SUCCEEDED":
        ref_res = await payment_provider.refund_payment(order.payment.transaction_id, order.total_amount)
        order.payment.status = ref_res.get("status", "REFUNDED")

    service_title = order.items[0].item_title if order.items else "Service"
    await NotificationEvents.order_status_changed(
        db=db,
        consumer_user_id=order.consumer_id,
        order_number=order.order_number,
        service_title=service_title,
        new_status="CANCELLED",
        reason=reason
    )

    await log_audit_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_CANCEL_ORDER",
        target_entity="Order",
        target_id=order.id,
        details={"previous_status": old_status, "reason": reason, "order_number": order.order_number}
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
        client_business_name=order.client.business_name if order.client else None,
        consumer_name=f"{order.consumer.first_name} {order.consumer.last_name}" if order.consumer else None,
        consumer_email=order.consumer.email if order.consumer else None,
        items=order.items,
        payment=order.payment,
        review=order.review
    )

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    req: CategoryCreate,
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(Category).where(Category.slug == req.slug.strip().lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category with this slug already exists.")

    category = Category(
        name=req.name.strip(),
        slug=req.slug.strip().lower(),
        description=req.description,
        icon=req.icon or "Folder",
        is_active=True
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

@router.get("/analytics", response_model=AdminAnalyticsResponse)
async def get_admin_analytics(
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    # Total Users
    total_users_res = await db.execute(select(func.count(User.id)))
    total_users = total_users_res.scalar_one()

    # Consumers
    consumers_res = await db.execute(
        select(func.count(User.id)).join(Role).where(Role.name == "consumer")
    )
    total_consumers = consumers_res.scalar_one()

    # Clients
    clients_res = await db.execute(
        select(func.count(User.id)).join(Role).where(Role.name == "client")
    )
    total_clients = clients_res.scalar_one()

    # Approved Clients
    approved_clients_res = await db.execute(
        select(func.count(ClientProfile.id)).where(ClientProfile.approval_status == "APPROVED")
    )
    approved_clients = approved_clients_res.scalar_one()

    # Pending Approvals
    pending_res = await db.execute(
        select(func.count(ClientProfile.id)).where(ClientProfile.approval_status == "PENDING_APPROVAL")
    )
    pending_approvals = pending_res.scalar_one()

    # Total Services
    services_res = await db.execute(select(func.count(ServiceProduct.id)))
    total_services = services_res.scalar_one()

    # Orders & GMV
    orders_res = await db.execute(
        select(
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0),
            func.coalesce(func.sum(Order.platform_fee), 0)
        )
    )
    order_data = orders_res.one()
    total_orders = order_data[0]
    gmv = order_data[1]
    platform_rev = order_data[2]

    # Order Status Breakdown
    active_res = await db.execute(
        select(func.count(Order.id)).where(Order.status.in_(["ACCEPTED", "IN_PROGRESS"]))
    )
    active_orders = active_res.scalar_one()

    pending_orders_res = await db.execute(
        select(func.count(Order.id)).where(Order.status == "PENDING")
    )
    pending_orders = pending_orders_res.scalar_one()

    completed_orders_res = await db.execute(
        select(func.count(Order.id)).where(Order.status == "COMPLETED")
    )
    completed_orders = completed_orders_res.scalar_one()

    cancelled_orders_res = await db.execute(
        select(func.count(Order.id)).where(Order.status.in_(["CANCELLED", "REJECTED"]))
    )
    cancelled_orders = cancelled_orders_res.scalar_one()

    # Pending Payouts (earnings for orders completed or held)
    payouts_res = await db.execute(
        select(func.coalesce(func.sum(Order.client_earnings), 0)).where(Order.status == "COMPLETED")
    )
    pending_payouts = payouts_res.scalar_one()

    return AdminAnalyticsResponse(
        total_users=total_users,
        total_consumers=total_consumers,
        total_clients=total_clients,
        approved_clients=approved_clients,
        pending_client_approvals=pending_approvals,
        total_services=total_services,
        total_orders=total_orders,
        active_orders=active_orders,
        pending_orders=pending_orders,
        completed_orders=completed_orders,
        cancelled_orders=cancelled_orders,
        gross_merchandise_value=Decimal(str(gmv)),
        total_platform_revenue=Decimal(str(platform_rev)),
        pending_payouts=Decimal(str(pending_payouts))
    )

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(AuditLog)
        .options(selectinload(AuditLog.actor))
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )
    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            actor_email=log.actor.email if log.actor else None,
            action=log.action,
            target_entity=log.target_entity,
            target_id=log.target_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at
        )
        for log in logs
    ]

@router.get("/services")
async def list_all_services(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(ServiceProduct)
        .options(
            selectinload(ServiceProduct.category),
            selectinload(ServiceProduct.client)
        )
        .order_by(desc(ServiceProduct.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    services = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "price": float(s.price),
            "category_name": s.category.name if s.category else "General",
            "client_business_name": s.client.business_name if s.client else "Unknown",
            "client_id": s.client_id,
            "client_approval_status": s.client.approval_status if s.client else "UNKNOWN",
            "is_available": s.is_available,
            "created_at": s.created_at
        }
        for s in services
    ]

@router.patch("/services/{service_id}/toggle")
async def toggle_service_availability(
    service_id: str,
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ServiceProduct).where(ServiceProduct.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    service.is_available = not service.is_available

    await log_audit_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_TOGGLE_SERVICE_AVAILABILITY",
        target_entity="ServiceProduct",
        target_id=service.id,
        details={"is_available": service.is_available, "title": service.title}
    )

    await db.commit()
    return {"message": f"Service availability toggled to {service.is_available}", "is_available": service.is_available}

@router.get("/reviews")
async def list_all_reviews(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Review)
        .options(
            selectinload(Review.consumer),
            selectinload(Review.client),
            selectinload(Review.order)
        )
        .order_by(desc(Review.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    reviews = result.scalars().all()
    return [
        {
            "id": r.id,
            "order_id": r.order_id,
            "order_number": r.order.order_number if r.order else None,
            "rating": r.rating,
            "comment": r.comment,
            "consumer_name": f"{r.consumer.first_name} {r.consumer.last_name}" if r.consumer else None,
            "client_business_name": r.client.business_name if r.client else None,
            "created_at": r.created_at
        }
        for r in reviews
    ]

@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: str,
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    await log_audit_action(
        db=db,
        actor_id=current_user.id,
        action="ADMIN_DELETE_REVIEW",
        target_entity="Review",
        target_id=review.id,
        details={"rating": review.rating, "comment": review.comment}
    )

    await db.delete(review)
    await db.commit()
    return {"message": "Review deleted successfully"}

@router.get("/notifications", response_model=List[NotificationResponse])
async def list_admin_notifications(
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.recipient_id == current_user.id)
        .order_by(desc(Notification.created_at))
    )
    return result.scalars().all()

@router.patch("/notifications/{notification_id}/read")
async def mark_admin_notification_read(
    notification_id: str,
    current_user: User = Depends(admin_guard),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}

@router.patch("/notifications/read-all")
async def mark_all_admin_notifications_read(
    current_user: User = Depends(admin_guard),
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
