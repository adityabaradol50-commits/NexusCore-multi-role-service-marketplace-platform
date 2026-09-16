from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ----------------- Auth Schemas -----------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str
    user_id: str
    role: str
    email: str
    first_name: str
    last_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = None
    role: str = Field(default="consumer", pattern="^(consumer|client)$")
    # If client, required business details
    business_name: Optional[str] = None
    business_registration_no: Optional[str] = None
    bio: Optional[str] = None
    service_area: Optional[str] = None

# ----------------- Profile Schemas -----------------
class ConsumerProfileResponse(BaseModel):
    id: str
    avatar_url: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ConsumerProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

class ClientProfileResponse(BaseModel):
    id: str
    business_name: str
    business_registration_no: Optional[str] = None
    bio: Optional[str] = None
    logo_url: Optional[str] = None
    service_area: Optional[str] = None
    approval_status: str
    rejection_reason: Optional[str] = None
    available_balance: Decimal
    created_at: datetime
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ClientProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    business_registration_no: Optional[str] = None
    bio: Optional[str] = None
    logo_url: Optional[str] = None
    service_area: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

class ClientCustomerResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    total_orders: int
    total_spent: Decimal
    last_order_date: datetime

    model_config = ConfigDict(from_attributes=True)

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    consumer_profile: Optional[ConsumerProfileResponse] = None
    client_profile: Optional[ClientProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Category & Catalog Schemas -----------------
class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None

class ServiceProductResponse(BaseModel):
    id: str
    client_id: str
    category_id: str
    title: str
    description: str
    price: Decimal
    duration_minutes: Optional[int] = None
    is_available: bool
    is_test_fixture: bool = False
    image_urls: List[str] = []
    category: Optional[CategoryResponse] = None
    client_business_name: Optional[str] = None
    client_bio: Optional[str] = None
    client_service_area: Optional[str] = None
    client_logo_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ServiceProductCreate(BaseModel):
    category_id: str
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10)
    price: Decimal = Field(gt=0)
    duration_minutes: Optional[int] = Field(default=60, gt=0)
    is_available: bool = True
    is_test_fixture: bool = False
    image_urls: List[str] = []

class ServiceProductUpdate(BaseModel):
    category_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    duration_minutes: Optional[int] = None
    is_available: Optional[bool] = None
    is_test_fixture: Optional[bool] = None
    image_urls: Optional[List[str]] = None

# ----------------- Order & Booking Schemas -----------------
class OrderItemCreate(BaseModel):
    service_product_id: str
    quantity: int = Field(default=1, gt=0)

class OrderCreateRequest(BaseModel):
    service_product_id: str
    quantity: int = Field(default=1, gt=0)
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    payment_method: str = "card"

class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(ACCEPTED|REJECTED|IN_PROGRESS|COMPLETED|CANCELLED)$")
    rejection_reason: Optional[str] = None

class OrderItemResponse(BaseModel):
    id: str
    service_product_id: str
    unit_price: Decimal
    quantity: int
    item_title: str

    model_config = ConfigDict(from_attributes=True)

class PaymentResponse(BaseModel):
    id: str
    transaction_id: Optional[str] = None
    amount: Decimal
    currency: str
    status: str
    payment_method: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReviewResponse(BaseModel):
    id: str
    order_id: str
    client_id: str
    consumer_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    order_number: str
    consumer_id: str
    client_id: str
    status: str
    total_amount: Decimal
    platform_fee: Decimal
    client_earnings: Decimal
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    client_business_name: Optional[str] = None
    consumer_name: Optional[str] = None
    consumer_email: Optional[str] = None
    items: List[OrderItemResponse] = []
    payment: Optional[PaymentResponse] = None
    review: Optional[ReviewResponse] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Notification Schemas -----------------
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Admin Schemas -----------------
class UserStatusUpdate(BaseModel):
    status: str = Field(pattern="^(ACTIVE|SUSPENDED)$")
    reason: Optional[str] = None

class ClientApprovalUpdate(BaseModel):
    approval_status: str = Field(pattern="^(APPROVED|REJECTED)$")
    rejection_reason: Optional[str] = None

class AdminAnalyticsResponse(BaseModel):
    total_users: int
    total_consumers: int
    total_clients: int
    approved_clients: int
    pending_client_approvals: int
    total_services: int
    total_orders: int
    active_orders: int
    pending_orders: int
    completed_orders: int
    cancelled_orders: int
    gross_merchandise_value: Decimal
    total_platform_revenue: Decimal
    pending_payouts: Decimal

class AuditLogResponse(BaseModel):
    id: str
    actor_id: str
    actor_email: Optional[str] = None
    action: str
    target_entity: str
    target_id: str
    details: Any = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
