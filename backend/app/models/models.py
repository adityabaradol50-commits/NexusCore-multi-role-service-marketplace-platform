import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime, CheckConstraint, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(32), unique=True, nullable=False, index=True) # admin, client, consumer
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    status = Column(String(32), default="ACTIVE", index=True) # ACTIVE, SUSPENDED, PENDING_VERIFICATION
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    role = relationship("Role", back_populates="users", lazy="joined")
    consumer_profile = relationship("ConsumerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="joined")
    client_profile = relationship("ClientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="joined")
    orders_placed = relationship("Order", back_populates="consumer", foreign_keys="Order.consumer_id")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor")


class ConsumerProfile(Base):
    __tablename__ = "consumer_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    avatar_url = Column(String(512), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), default="US")

    user = relationship("User", back_populates="consumer_profile")


class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_name = Column(String(255), nullable=False, index=True)
    business_registration_no = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    logo_url = Column(String(512), nullable=True)
    service_area = Column(String(255), nullable=True)
    approval_status = Column(String(32), default="PENDING_APPROVAL", index=True) # PENDING_APPROVAL, APPROVED, REJECTED
    rejection_reason = Column(Text, nullable=True)
    available_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="client_profile")
    services = relationship("ServiceProduct", back_populates="client", cascade="all, delete-orphan")
    orders_received = relationship("Order", back_populates="client", foreign_keys="Order.client_id")
    reviews = relationship("Review", back_populates="client")


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    services = relationship("ServiceProduct", back_populates="category")


class ServiceProduct(Base):
    __tablename__ = "services_products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("client_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    is_available = Column(Boolean, default=True, index=True)
    is_test_fixture = Column(Boolean, default=False, nullable=False, index=True)
    image_urls = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    client = relationship("ClientProfile", back_populates="services", lazy="joined")
    category = relationship("Category", back_populates="services", lazy="joined")
    order_items = relationship("OrderItem", back_populates="service_product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_number = Column(String(32), unique=True, nullable=False, index=True)
    consumer_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(String(36), ForeignKey("client_profiles.id"), nullable=False, index=True)
    status = Column(String(32), default="PENDING", nullable=False, index=True) 
    # PENDING, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED
    total_amount = Column(Numeric(10, 2), nullable=False)
    platform_fee = Column(Numeric(10, 2), default=0.00, nullable=False)
    client_earnings = Column(Numeric(10, 2), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    consumer = relationship("User", back_populates="orders_placed", foreign_keys=[consumer_id], lazy="joined")
    client = relationship("ClientProfile", back_populates="orders_received", foreign_keys=[client_id], lazy="joined")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan", lazy="joined")
    review = relationship("Review", back_populates="order", uselist=False, cascade="all, delete-orphan", lazy="joined")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    service_product_id = Column(String(36), ForeignKey("services_products.id"), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    item_title = Column(String(255), nullable=False)

    order = relationship("Order", back_populates="items")
    service_product = relationship("ServiceProduct", back_populates="order_items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    transaction_id = Column(String(128), unique=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="USD")
    status = Column(String(32), default="PENDING", nullable=False, index=True) # PENDING, SUCCEEDED, FAILED, REFUNDED
    payment_method = Column(String(50), default="credit_card")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    order = relationship("Order", back_populates="payment")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id"), unique=True, nullable=False)
    client_id = Column(String(36), ForeignKey("client_profiles.id"), nullable=False, index=True)
    consumer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_valid_rating"),
    )

    order = relationship("Order", back_populates="review")
    client = relationship("ClientProfile", back_populates="reviews")
    consumer = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    recipient = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    target_entity = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=False)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    actor = relationship("User", back_populates="audit_logs")
