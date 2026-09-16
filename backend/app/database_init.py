import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, text, func
from app.database import engine, AsyncSessionLocal, Base
from app.models.models import (
    Role, User, ConsumerProfile, ClientProfile, Category, ServiceProduct, 
    Order, OrderItem, Payment, Review, Notification, AuditLog
)
from app.config import settings
from app.core.security import hash_password

def utc_now():
    return datetime.now(timezone.utc)

async def init_db():
    """
    Initializes database schema, mandatory system roles, system superuser,
    and seeds a rich, active marketplace demo dataset (owners, services, clients, orders, payments, reviews, notifications).
    """
    # 1. Create tables if they do not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Add legacy column for existing local SQLite databases if missing
    if engine.dialect.name == "sqlite":
        async with engine.begin() as conn:
            try:
                await conn.execute(text("ALTER TABLE services_products ADD COLUMN is_test_fixture BOOLEAN DEFAULT 0"))
            except Exception:
                pass # Column already exists

    async with AsyncSessionLocal() as session:
        # 2. Seed Mandatory Roles (Admin, Client, Consumer)
        roles_data = [
            {"id": 1, "name": "admin", "description": "Platform administrator with full governance access"},
            {"id": 2, "name": "client", "description": "Business or service provider managing offerings and bookings"},
            {"id": 3, "name": "consumer", "description": "End-user customer discovering services and making bookings"}
        ]
        for r in roles_data:
            existing = await session.execute(select(Role).where(Role.id == r["id"]))
            if not existing.scalar_one_or_none():
                session.add(Role(id=r["id"], name=r["name"], description=r["description"]))
        await session.commit()

        # 3. Provision Initial Admin Superuser
        admin_email = os.getenv("FIRST_SUPERUSER_EMAIL", "admin@nexuscore.com")
        admin_password = os.getenv("FIRST_SUPERUSER_PASSWORD", "AdminPassword123!")

        admin_user = None
        if admin_email and admin_password:
            admin_check = await session.execute(select(User).where(User.email == admin_email))
            admin_user = admin_check.scalar_one_or_none()
            if not admin_user:
                admin_user = User(
                    email=admin_email.lower().strip(),
                    hashed_password=hash_password(admin_password),
                    first_name="System",
                    last_name="Administrator",
                    phone="+1-555-0100",
                    role_id=1,
                    status="ACTIVE"
                )
                session.add(admin_user)
                await session.commit()
                await session.refresh(admin_user)
                print(f"[OK] System Superuser initialized: {admin_email}")

        # 4. Provision Marketplace Categories
        categories_to_seed = [
            {
                "name": "Wellness & Personal Training",
                "slug": "wellness-fitness",
                "description": "Wellness, holistic healing, and personal growth offerings",
                "icon": "Heart"
            },
            {
                "name": "Professional Consulting",
                "slug": "professional-consulting",
                "description": "Professional advisory, coaching, and strategic guidance",
                "icon": "Briefcase"
            },
            {
                "name": "Home Services",
                "slug": "home-services",
                "description": "Residential repairs, electrical work, plumbing, and home maintenance",
                "icon": "Home"
            },
            {
                "name": "Fitness & Wellness",
                "slug": "fitness-wellness",
                "description": "Personal fitness training, movement mechanics, and health coaching",
                "icon": "Activity"
            },
            {
                "name": "Education & Tutoring",
                "slug": "education-tutoring",
                "description": "Software engineering mentorship, academic tutoring, and skill development",
                "icon": "BookOpen"
            },
            {
                "name": "Design & Creative",
                "slug": "design-creative",
                "description": "Brand strategy, visual design, UI/UX critiques, and vector design",
                "icon": "Palette"
            },
            {
                "name": "Technology & Development",
                "slug": "technology-dev",
                "description": "Software development advisory, code audits, and tech consulting",
                "icon": "Code"
            },
            {
                "name": "Photography & Media",
                "slug": "photography-media",
                "description": "Professional portrait, event photography, and media production",
                "icon": "Camera"
            }
        ]
        category_map = {}
        for cat in categories_to_seed:
            cat_check = await session.execute(select(Category).where(Category.slug == cat["slug"]))
            existing_cat = cat_check.scalar_one_or_none()
            if not existing_cat:
                new_cat = Category(
                    name=cat["name"],
                    slug=cat["slug"],
                    description=cat["description"],
                    icon=cat["icon"],
                    is_active=True
                )
                session.add(new_cat)
                await session.commit()
                await session.refresh(new_cat)
                category_map[cat["name"]] = new_cat
            else:
                category_map[cat["name"]] = existing_cat

        # 5. Provision Demo Owners & Businesses (Skipped in production unless SEED_DEMO_DATA=true)
        should_seed_demo = (
            settings.ENVIRONMENT.lower() != "production" 
            or os.getenv("SEED_DEMO_DATA", "false").lower() in ("true", "1", "yes")
        )
        if not should_seed_demo:
            print("[INFO] Production mode detected (SEED_DEMO_DATA=false). Initialized schema, roles, superuser, and categories. Skipping mock demo data.")
            return

        owners_to_seed = [
            {
                "email": "snigdhahealer157@gmail.com",
                "password": "SungmoPassword123!",
                "first_name": "Snigdha",
                "last_name": "Sharma",
                "phone": "+91 8859999333",
                "business_name": "Sungmo Heals",
                "logo_url": "/sungmo_heals_lotus.svg",
                "service_area": "Online Sessions",
                "bio": (
                    "Owner & Representative: Snigdha Sharma\n"
                    "Professional Roles:\n"
                    "• Life Coach\n"
                    "• Inner Child Healer\n"
                    "• Rapid Reiki Healer\n"
                    "• Intuitive Tarot Reader\n"
                    "• Quantum Ho'oponopono Healer"
                ),
                "category_name": "Wellness & Personal Training",
                "services": [
                    {
                        "title": "Life Coaching",
                        "description": "Personal life coaching sessions focused on guidance, reflection, and personal development.",
                        "price": 150.00,
                        "duration_minutes": 60
                    },
                    {
                        "title": "Inner Child Healing",
                        "description": "Online sessions focused on guided reflection and inner-child-focused personal work.",
                        "price": 180.00,
                        "duration_minutes": 60
                    },
                    {
                        "title": "Rapid Reiki Healing",
                        "description": "Online Reiki healing sessions offered by Sungmo Heals.",
                        "price": 120.00,
                        "duration_minutes": 45
                    },
                    {
                        "title": "Intuitive Tarot Reading",
                        "description": "Intuitive tarot reading sessions conducted online.",
                        "price": 90.00,
                        "duration_minutes": 30
                    },
                    {
                        "title": "Quantum Ho'oponopono Healing",
                        "description": "Online Ho'oponopono-focused sessions offered by Sungmo Heals.",
                        "price": 160.00,
                        "duration_minutes": 60
                    }
                ]
            },
            {
                "email": "vikram.mehta.demo@urbanfix.local",
                "password": "OwnerPassword123!",
                "first_name": "Vikram",
                "last_name": "Mehta",
                "phone": "+1-555-0191",
                "business_name": "UrbanFix Services",
                "logo_url": None,
                "service_area": "In-Person & On-Site",
                "bio": "Owner: Vikram Mehta. Professional residential electrical inspections, plumbing repairs, and home safety audits.",
                "category_name": "Home Services",
                "services": [
                    {
                        "title": "Residential Electrical Inspection",
                        "description": "Comprehensive safety inspection of residential wiring, electrical panels, and fixtures.",
                        "price": 120.00,
                        "duration_minutes": 90
                    },
                    {
                        "title": "Plumbing Repairs & Maintenance",
                        "description": "Professional leak detection, pipe repair, and fixture installation services.",
                        "price": 95.00,
                        "duration_minutes": 60
                    },
                    {
                        "title": "Home Safety Audit",
                        "description": "Full home hazard evaluation, smoke alarm testing, and safety recommendations.",
                        "price": 150.00,
                        "duration_minutes": 120
                    }
                ]
            },
            {
                "email": "marcus.vance.demo@codecraft.local",
                "password": "OwnerPassword123!",
                "first_name": "Marcus",
                "last_name": "Vance",
                "phone": "+1-555-0192",
                "business_name": "CodeCraft Academy",
                "logo_url": None,
                "service_area": "Online Sessions",
                "bio": "Owner: Marcus Vance. Specialized computer science tutoring, full-stack mentorship, and code reviews.",
                "category_name": "Education & Tutoring",
                "services": [
                    {
                        "title": "Python & Full-Stack Web Mentorship",
                        "description": "1-on-1 coding mentorship covering React, Next.js, and FastAPI backend development.",
                        "price": 80.00,
                        "duration_minutes": 60
                    },
                    {
                        "title": "Data Structures & Algorithms Prep",
                        "description": "Focused problem-solving sessions targeting software engineering technical interviews.",
                        "price": 100.00,
                        "duration_minutes": 60
                    },
                    {
                        "title": "Code Review & Architecture Critique",
                        "description": "Deep-dive code review and architectural guidance for personal or application projects.",
                        "price": 110.00,
                        "duration_minutes": 45
                    }
                ]
            },
            {
                "email": "elena.rostova.demo@fitsphere.local",
                "password": "OwnerPassword123!",
                "first_name": "Elena",
                "last_name": "Rostova",
                "phone": "+1-555-0193",
                "business_name": "FitSphere Studio",
                "logo_url": None,
                "service_area": "Online & Hybrid Studio",
                "bio": "Owner: Elena Rostova. Certified personal fitness training, movement mechanics, and posture assessments.",
                "category_name": "Fitness & Wellness",
                "services": [
                    {
                        "title": "1-on-1 Personalized Strength Training",
                        "description": "Customized workout sessions focused on strength progression and movement form.",
                        "price": 75.00,
                        "duration_minutes": 60
                    },
                    {
                        "title": "Posture & Core Stability Assessment",
                        "description": "Evaluation of posture, mobility restrictions, and core engagement exercises.",
                        "price": 65.00,
                        "duration_minutes": 45
                    },
                    {
                        "title": "Virtual High-Intensity Cardio Session",
                        "description": "Energetic online interval training session tailored to your fitness level.",
                        "price": 50.00,
                        "duration_minutes": 45
                    }
                ]
            },
            {
                "email": "sophia.lin.demo@pixelnest.local",
                "password": "OwnerPassword123!",
                "first_name": "Sophia",
                "last_name": "Lin",
                "phone": "+1-555-0194",
                "business_name": "PixelNest Creative",
                "logo_url": None,
                "service_area": "Online Sessions",
                "bio": "Owner: Sophia Lin. Brand identity strategy, UI/UX layout critiques, and visual asset production.",
                "category_name": "Design & Creative",
                "services": [
                    {
                        "title": "Brand Identity Strategy Session",
                        "description": "Strategic consultation defining brand voice, color palettes, and visual hierarchy.",
                        "price": 200.00,
                        "duration_minutes": 90
                    },
                    {
                        "title": "UI/UX App Layout Critique",
                        "description": "Detailed UX audit and layout feedback for mobile or web applications.",
                        "price": 140.00,
                        "duration_minutes": 60
                    },
                    {
                        "title": "Custom Logo & Vector Suite",
                        "description": "Professional logo design package including vector source files and brand guidelines.",
                        "price": 350.00,
                        "duration_minutes": 180
                    }
                ]
            },
            {
                "email": "david.sterling.demo@smartbiz.local",
                "password": "OwnerPassword123!",
                "first_name": "David",
                "last_name": "Sterling",
                "phone": "+1-555-0195",
                "business_name": "SmartBiz Consulting",
                "logo_url": None,
                "service_area": "Online Sessions",
                "bio": "Owner: David Sterling. Executive business consulting, operational workflow optimization, and financial strategy.",
                "category_name": "Professional Consulting",
                "services": [
                    {
                        "title": "Small Business Financial Advisory",
                        "description": "Financial model review, cash flow optimization, and budgeting strategy.",
                        "price": 250.00,
                        "duration_minutes": 90
                    },
                    {
                        "title": "Operational Strategy & Efficiency Audit",
                        "description": "Analysis of business workflows, tooling, and team efficiency improvements.",
                        "price": 300.00,
                        "duration_minutes": 120
                    }
                ]
            }
        ]

        owner_profiles = {}
        services_by_title = {}

        for o_data in owners_to_seed:
            u_check = await session.execute(select(User).where(User.email == o_data["email"]))
            o_user = u_check.scalar_one_or_none()
            if not o_user:
                o_user = User(
                    email=o_data["email"],
                    hashed_password=hash_password(o_data["password"]),
                    first_name=o_data["first_name"],
                    last_name=o_data["last_name"],
                    phone=o_data["phone"],
                    role_id=2, # Client (Owner)
                    status="ACTIVE"
                )
                session.add(o_user)
                await session.commit()
                await session.refresh(o_user)

            cp_check = await session.execute(select(ClientProfile).where(ClientProfile.user_id == o_user.id))
            o_profile = cp_check.scalar_one_or_none()
            if not o_profile:
                o_profile = ClientProfile(
                    user_id=o_user.id,
                    business_name=o_data["business_name"],
                    bio=o_data["bio"],
                    logo_url=o_data["logo_url"],
                    service_area=o_data["service_area"],
                    approval_status="APPROVED",
                    available_balance=0.00
                )
                session.add(o_profile)
                await session.commit()
                await session.refresh(o_profile)
            else:
                o_profile.bio = o_data["bio"]
                o_profile.approval_status = "APPROVED"
                if o_data["logo_url"]:
                    o_profile.logo_url = o_data["logo_url"]
                await session.commit()

            owner_profiles[o_data["business_name"]] = o_profile

            # Seed Services
            cat_obj = category_map.get(o_data["category_name"]) or list(category_map.values())[0]
            for s_info in o_data["services"]:
                svc_check = await session.execute(
                    select(ServiceProduct).where(
                        ServiceProduct.client_id == o_profile.id,
                        ServiceProduct.title == s_info["title"]
                    )
                )
                existing_svc = svc_check.scalar_one_or_none()
                if not existing_svc:
                    existing_svc = ServiceProduct(
                        client_id=o_profile.id,
                        category_id=cat_obj.id,
                        title=s_info["title"],
                        description=s_info["description"],
                        price=s_info["price"],
                        duration_minutes=s_info["duration_minutes"],
                        is_available=True,
                        is_test_fixture=False
                    )
                    session.add(existing_svc)
                    await session.commit()
                    await session.refresh(existing_svc)
                else:
                    existing_svc.price = s_info["price"]
                    existing_svc.duration_minutes = s_info["duration_minutes"]
                    existing_svc.description = s_info["description"]
                    existing_svc.is_available = True
                    existing_svc.is_test_fixture = False
                    await session.commit()

                services_by_title[(o_data["business_name"], s_info["title"])] = existing_svc

        # 6. Provision Demo Clients (10 Buyers)
        clients_to_seed = [
            {"email": "client.demo@nexuscore.local", "first_name": "Alex", "last_name": "Morgan", "phone": "+1-555-0201"},
            {"email": "sarah.jenkins.demo@client.local", "first_name": "Sarah", "last_name": "Jenkins", "phone": "+1-555-0202"},
            {"email": "michael.chang.demo@client.local", "first_name": "Michael", "last_name": "Chang", "phone": "+1-555-0203"},
            {"email": "priya.sharma.demo@client.local", "first_name": "Priya", "last_name": "Sharma", "phone": "+1-555-0204"},
            {"email": "james.wilson.demo@client.local", "first_name": "James", "last_name": "Wilson", "phone": "+1-555-0205"},
            {"email": "emily.davis.demo@client.local", "first_name": "Emily", "last_name": "Davis", "phone": "+1-555-0206"},
            {"email": "robert.taylor.demo@client.local", "first_name": "Robert", "last_name": "Taylor", "phone": "+1-555-0207"},
            {"email": "ananya.patel.demo@client.local", "first_name": "Ananya", "last_name": "Patel", "phone": "+1-555-0208"},
            {"email": "david.kumar.demo@client.local", "first_name": "David", "last_name": "Kumar", "phone": "+1-555-0209"},
            {"email": "lisa.anderson.demo@client.local", "first_name": "Lisa", "last_name": "Anderson", "phone": "+1-555-0210"},
        ]

        demo_clients = {}
        for c_data in clients_to_seed:
            c_check = await session.execute(select(User).where(User.email == c_data["email"]))
            c_user = c_check.scalar_one_or_none()
            if not c_user:
                c_user = User(
                    email=c_data["email"],
                    hashed_password=hash_password("ClientDemo123!"),
                    first_name=c_data["first_name"],
                    last_name=c_data["last_name"],
                    phone=c_data["phone"],
                    role_id=3, # Consumer (Client)
                    status="ACTIVE"
                )
                session.add(c_user)
                await session.commit()
                await session.refresh(c_user)

                c_prof = ConsumerProfile(
                    user_id=c_user.id,
                    city="New York",
                    country="US"
                )
                session.add(c_prof)
                await session.commit()
            demo_clients[c_data["email"]] = c_user

        # 7. Provision Demo Orders, Payments, Reviews, and Notifications
        orders_data = [
            {
                "order_number": "ORD-DEMO-101",
                "client_email": "client.demo@nexuscore.local",
                "business_name": "Sungmo Heals",
                "service_title": "Inner Child Healing",
                "status": "COMPLETED",
                "notes": "Session request for inner child work.",
                "days_ago": 5,
                "review": {
                    "rating": 5,
                    "comment": "Transformative session! Very calm, reflective and guiding."
                }
            },
            {
                "order_number": "ORD-DEMO-102",
                "client_email": "client.demo@nexuscore.local",
                "business_name": "CodeCraft Academy",
                "service_title": "Python & Full-Stack Web Mentorship",
                "status": "COMPLETED",
                "notes": "Mentorship on React and Next.js state management.",
                "days_ago": 3,
                "review": {
                    "rating": 5,
                    "comment": "Extremely insightful session. Clear explanation of Next.js state management."
                }
            },
            {
                "order_number": "ORD-DEMO-103",
                "client_email": "client.demo@nexuscore.local",
                "business_name": "Sungmo Heals",
                "service_title": "Life Coaching",
                "status": "IN_PROGRESS",
                "notes": "Looking forward to our upcoming coaching session.",
                "days_ago": 1
            },
            {
                "order_number": "ORD-DEMO-104",
                "client_email": "client.demo@nexuscore.local",
                "business_name": "FitSphere Studio",
                "service_title": "1-on-1 Personalized Strength Training",
                "status": "PENDING",
                "notes": "Evening session preference if available.",
                "days_ago": 0
            },
            {
                "order_number": "ORD-DEMO-105",
                "client_email": "sarah.jenkins.demo@client.local",
                "business_name": "Sungmo Heals",
                "service_title": "Rapid Reiki Healing",
                "status": "COMPLETED",
                "notes": "Reiki healing online session.",
                "days_ago": 7,
                "review": {
                    "rating": 5,
                    "comment": "Very soothing experience. Snigdha was highly professional."
                }
            },
            {
                "order_number": "ORD-DEMO-106",
                "client_email": "michael.chang.demo@client.local",
                "business_name": "UrbanFix Services",
                "service_title": "Residential Electrical Inspection",
                "status": "COMPLETED",
                "notes": "Full home panel inspection.",
                "days_ago": 6,
                "review": {
                    "rating": 4,
                    "comment": "Thorough inspection and helpful safety recommendations."
                }
            },
            {
                "order_number": "ORD-DEMO-107",
                "client_email": "priya.sharma.demo@client.local",
                "business_name": "Sungmo Heals",
                "service_title": "Intuitive Tarot Reading",
                "status": "COMPLETED",
                "notes": "Online tarot session.",
                "days_ago": 4,
                "review": {
                    "rating": 5,
                    "comment": "Insightful reading. Appreciated the guidance and clarity."
                }
            },
            {
                "order_number": "ORD-DEMO-108",
                "client_email": "james.wilson.demo@client.local",
                "business_name": "PixelNest Creative",
                "service_title": "Brand Identity Strategy Session",
                "status": "COMPLETED",
                "notes": "Brand strategy consultation for new startup.",
                "days_ago": 8,
                "review": {
                    "rating": 5,
                    "comment": "Sophia gave fantastic direction for our brand overhaul."
                }
            },
            {
                "order_number": "ORD-DEMO-109",
                "client_email": "emily.davis.demo@client.local",
                "business_name": "SmartBiz Consulting",
                "service_title": "Small Business Financial Advisory",
                "status": "COMPLETED",
                "notes": "Q3 budgeting and advisory.",
                "days_ago": 2,
                "review": {
                    "rating": 5,
                    "comment": "David provided clear cash flow projections and strategic recommendations."
                }
            },
            {
                "order_number": "ORD-DEMO-110",
                "client_email": "robert.taylor.demo@client.local",
                "business_name": "FitSphere Studio",
                "service_title": "Posture & Core Stability Assessment",
                "status": "ACCEPTED",
                "notes": "Focus on neck and shoulder strain.",
                "days_ago": 1
            },
            {
                "order_number": "ORD-DEMO-111",
                "client_email": "ananya.patel.demo@client.local",
                "business_name": "Sungmo Heals",
                "service_title": "Quantum Ho'oponopono Healing",
                "status": "PENDING",
                "notes": "Morning session preferred.",
                "days_ago": 0
            },
            {
                "order_number": "ORD-DEMO-112",
                "client_email": "david.kumar.demo@client.local",
                "business_name": "UrbanFix Services",
                "service_title": "Plumbing Repairs & Maintenance",
                "status": "REJECTED",
                "rejection_reason": "Schedule conflict for requested time slot.",
                "notes": "Weekend pipe check.",
                "days_ago": 4
            },
            {
                "order_number": "ORD-DEMO-113",
                "client_email": "lisa.anderson.demo@client.local",
                "business_name": "CodeCraft Academy",
                "service_title": "Code Review & Architecture Critique",
                "status": "CANCELLED",
                "notes": "Postponed project launch.",
                "days_ago": 3
            }
        ]

        for o_info in orders_data:
            ord_check = await session.execute(select(Order).where(Order.order_number == o_info["order_number"]))
            existing_ord = ord_check.scalar_one_or_none()

            client_user = demo_clients.get(o_info["client_email"])
            owner_prof = owner_profiles.get(o_info["business_name"])
            svc_obj = services_by_title.get((o_info["business_name"], o_info["service_title"]))

            if not client_user or not owner_prof or not svc_obj:
                continue

            item_price = float(svc_obj.price)
            total_amt = item_price
            plt_fee = round(total_amt * 0.10, 2)
            clr_earn = round(total_amt * 0.90, 2)
            created_time = utc_now() - timedelta(days=o_info["days_ago"])

            if not existing_ord:
                new_ord = Order(
                    order_number=o_info["order_number"],
                    consumer_id=client_user.id,
                    client_id=owner_prof.id,
                    status=o_info["status"],
                    total_amount=total_amt,
                    platform_fee=plt_fee,
                    client_earnings=clr_earn,
                    notes=o_info.get("notes"),
                    rejection_reason=o_info.get("rejection_reason"),
                    created_at=created_time,
                    updated_at=created_time
                )
                session.add(new_ord)
                await session.commit()
                await session.refresh(new_ord)
                existing_ord = new_ord

                # OrderItem
                ord_item = OrderItem(
                    order_id=existing_ord.id,
                    service_product_id=svc_obj.id,
                    unit_price=item_price,
                    quantity=1,
                    item_title=svc_obj.title
                )
                session.add(ord_item)

                # Payment
                pay_status = "REFUNDED" if o_info["status"] in ["REJECTED", "CANCELLED"] else "SUCCEEDED"
                payment = Payment(
                    order_id=existing_ord.id,
                    transaction_id=f"tx_demo_{o_info['order_number'].lower().replace('-', '_')}",
                    amount=total_amt,
                    currency="USD",
                    status=pay_status,
                    payment_method="card",
                    created_at=created_time
                )
                session.add(payment)

                # Review if provided and COMPLETED
                if o_info.get("review") and o_info["status"] == "COMPLETED":
                    rev_check = await session.execute(select(Review).where(Review.order_id == existing_ord.id))
                    if not rev_check.scalar_one_or_none():
                        review = Review(
                            order_id=existing_ord.id,
                            client_id=owner_prof.id,
                            consumer_id=client_user.id,
                            rating=o_info["review"]["rating"],
                            comment=o_info["review"]["comment"],
                            created_at=created_time + timedelta(hours=2)
                        )
                        session.add(review)

                # Notifications
                n1 = Notification(
                    recipient_id=client_user.id,
                    title=f"Booking Status: {o_info['status']}",
                    message=f"Your booking request ({o_info['order_number']}) for '{svc_obj.title}' is currently {o_info['status']}.",
                    link="/consumer/orders",
                    is_read=True if o_info["status"] == "COMPLETED" else False,
                    created_at=created_time
                )
                n2 = Notification(
                    recipient_id=owner_prof.user_id,
                    title=f"Order Update: {o_info['order_number']}",
                    message=f"Order ({o_info['order_number']}) for '{svc_obj.title}' from {client_user.first_name} {client_user.last_name} is {o_info['status']}.",
                    link="/client/requests",
                    is_read=True if o_info["status"] == "COMPLETED" else False,
                    created_at=created_time
                )
                session.add_all([n1, n2])
                await session.commit()

        # 8. Re-calculate available_balance for all owners based on COMPLETED orders
        for b_name, o_prof in owner_profiles.items():
            tot_earn_res = await session.execute(
                select(func.coalesce(func.sum(Order.client_earnings), 0.00))
                .where(Order.client_id == o_prof.id, Order.status == "COMPLETED")
            )
            tot_earn = tot_earn_res.scalar()
            o_prof.available_balance = float(tot_earn)
        await session.commit()

        # 9. Classify existing database services: mark test fixture services as is_test_fixture = True
        all_svcs_res = await session.execute(select(ServiceProduct))
        all_svcs = all_svcs_res.scalars().all()
        demo_owner_ids = {op.id for op in owner_profiles.values()}
        for s in all_svcs:
            if s.client_id in demo_owner_ids:
                s.is_test_fixture = False
            else:
                s.is_test_fixture = True
        await session.commit()

        print("[OK] Phase 8 Demo Data Seeding Completed Successfully.")

init_and_seed_db = init_db

if __name__ == "__main__":
    asyncio.run(init_db())
