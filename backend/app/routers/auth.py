from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import User, Role, ConsumerProfile, ClientProfile
from app.schemas.schemas import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # 1. Check if email already exists
    existing = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 2. Lookup role
    role_query = await db.execute(select(Role).where(Role.name == req.role.lower()))
    role = role_query.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified.")

    # 3. Create User
    new_user = User(
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        first_name=req.first_name.strip(),
        last_name=req.last_name.strip(),
        phone=req.phone.strip() if req.phone else None,
        role_id=role.id,
        status="ACTIVE"
    )
    db.add(new_user)
    await db.flush()

    # 4. Provision corresponding profile
    if role.name == "consumer":
        profile = ConsumerProfile(user_id=new_user.id)
        db.add(profile)
    elif role.name == "client":
        if not req.business_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business name is required for client registration."
            )
        profile = ClientProfile(
            user_id=new_user.id,
            business_name=req.business_name.strip(),
            business_registration_no=req.business_registration_no,
            bio=req.bio,
            service_area=req.service_area,
            approval_status="PENDING_APPROVAL"
        )
        db.add(profile)

    await db.commit()

    token_data = {"sub": new_user.id, "email": new_user.email, "role": role.name}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token,
        user_id=new_user.id,
        role=role.name,
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name
    )

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    query = (
        select(User)
        .options(selectinload(User.role))
        .where(User.email == req.email.lower().strip())
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if user.status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support."
        )

    role_name = user.role.name if user.role else "consumer"
    token_data = {"sub": user.id, "email": user.email, "role": role_name}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token,
        user_id=user.id,
        role=role_name,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    user_id = payload.get("sub")
    query = (
        select(User)
        .options(selectinload(User.role))
        .where(User.id == user_id)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or user.status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active."
        )

    role_name = user.role.name if user.role else "consumer"
    token_data = {"sub": user.id, "email": user.email, "role": role_name}
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        refresh_token=new_refresh_token,
        user_id=user.id,
        role=role_name,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone=current_user.phone,
        role=current_user.role.name if current_user.role else "consumer",
        status=current_user.status,
        created_at=current_user.created_at,
        consumer_profile=current_user.consumer_profile,
        client_profile=current_user.client_profile
    )
