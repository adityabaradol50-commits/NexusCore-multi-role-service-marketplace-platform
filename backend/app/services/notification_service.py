from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Notification

async def send_notification(
    db: AsyncSession,
    recipient_id: str,
    title: str,
    message: str,
    link: Optional[str] = None
) -> Notification:
    """
    Creates and records a persistent, deep-linked notification for a user.
    """
    notification = Notification(
        recipient_id=recipient_id,
        title=title,
        message=message,
        link=link,
        is_read=False
    )
    db.add(notification)
    return notification


class NotificationEvents:
    @staticmethod
    async def order_created(
        db: AsyncSession,
        client_user_id: str,
        consumer_user_id: str,
        order_number: str,
        service_title: str,
        consumer_name: str
    ):
        # Notify Client
        await send_notification(
            db=db,
            recipient_id=client_user_id,
            title="New Booking Request Received!",
            message=f"You received a new booking ({order_number}) for '{service_title}' from {consumer_name}.",
            link="/client/requests"
        )
        # Notify Consumer
        await send_notification(
            db=db,
            recipient_id=consumer_user_id,
            title="Booking Request Submitted",
            message=f"Your booking request ({order_number}) for '{service_title}' has been submitted.",
            link="/consumer/orders"
        )

    @staticmethod
    async def order_status_changed(
        db: AsyncSession,
        consumer_user_id: str,
        order_number: str,
        service_title: str,
        new_status: str,
        reason: Optional[str] = None
    ):
        status_titles = {
            "ACCEPTED": "Booking Accepted!",
            "IN_PROGRESS": "Service Work Commenced",
            "COMPLETED": "Service Completed!",
            "REJECTED": "Booking Request Declined",
            "CANCELLED": "Booking Cancelled"
        }
        title = status_titles.get(new_status, f"Order Status: {new_status}")

        if new_status == "ACCEPTED":
            msg = f"Provider accepted your booking ({order_number}) for '{service_title}'."
        elif new_status == "COMPLETED":
            msg = f"Your service ({order_number}) for '{service_title}' has been completed! Feel free to leave a review."
        elif new_status in ["REJECTED", "CANCELLED"]:
            msg = f"Your booking ({order_number}) was {new_status.lower()}." + (f" Reason: {reason}" if reason else "")
        else:
            msg = f"Your booking ({order_number}) is now {new_status.replace('_', ' ').lower()}."

        await send_notification(
            db=db,
            recipient_id=consumer_user_id,
            title=title,
            message=msg,
            link="/consumer/orders"
        )

    @staticmethod
    async def review_submitted(
        db: AsyncSession,
        client_user_id: str,
        consumer_name: str,
        order_number: str,
        rating: int
    ):
        await send_notification(
            db=db,
            recipient_id=client_user_id,
            title="New Customer Review Received!",
            message=f"{consumer_name} left a {rating}-star review for order {order_number}.",
            link="/client/dashboard"
        )
