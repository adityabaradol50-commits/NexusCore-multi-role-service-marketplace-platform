from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import Category, ServiceProduct, ClientProfile, Review
from app.schemas.schemas import CategoryResponse, ServiceProductResponse

router = APIRouter(prefix="/public", tags=["Public Catalog & Discovery"])

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.is_active == True).order_by(Category.name))
    return result.scalars().all()

@router.get("/services", response_model=List[ServiceProductResponse])
async def search_services(
    q: Optional[str] = Query(None, description="Search term in title or description"),
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sort: Optional[str] = Query("popular", description="popular, price_asc, price_desc, newest"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(ServiceProduct)
        .join(ClientProfile, ServiceProduct.client_id == ClientProfile.id)
        .options(
            selectinload(ServiceProduct.category),
            selectinload(ServiceProduct.client)
        )
        .where(
            and_(
                ServiceProduct.is_available == True,
                ServiceProduct.is_test_fixture == False,
                ClientProfile.approval_status == "APPROVED"
            )
        )
    )

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.where(
            (ServiceProduct.title.ilike(search_pattern)) | 
            (ServiceProduct.description.ilike(search_pattern)) |
            (ClientProfile.business_name.ilike(search_pattern))
        )

    if category_id:
        query = query.where(ServiceProduct.category_id == category_id)

    if min_price is not None:
        query = query.where(ServiceProduct.price >= min_price)

    if max_price is not None:
        query = query.where(ServiceProduct.price <= max_price)

    if sort == "price_asc":
        query = query.order_by(ServiceProduct.price.asc())
    elif sort == "price_desc":
        query = query.order_by(ServiceProduct.price.desc())
    elif sort == "newest":
        query = query.order_by(ServiceProduct.created_at.desc())
    else:
        query = query.order_by(ServiceProduct.created_at.desc())

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    services = result.scalars().all()

    response = []
    for s in services:
        item = ServiceProductResponse(
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
            client_business_name=s.client.business_name if s.client else None,
            client_bio=s.client.bio if s.client else None,
            client_service_area=s.client.service_area if s.client else None,
            client_logo_url=s.client.logo_url if s.client else None,
            created_at=s.created_at
        )
        response.append(item)

    return response

@router.get("/services/{service_id}", response_model=ServiceProductResponse)
async def get_service(service_id: str, db: AsyncSession = Depends(get_db)):
    query = (
        select(ServiceProduct)
        .options(
            selectinload(ServiceProduct.category),
            selectinload(ServiceProduct.client)
        )
        .where(ServiceProduct.id == service_id)
    )
    result = await db.execute(query)
    service = result.scalar_one_or_none()

    if not service or not service.is_available or not service.client or service.client.approval_status != "APPROVED":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service or product not found")

    return ServiceProductResponse(
        id=service.id,
        client_id=service.client_id,
        category_id=service.category_id,
        title=service.title,
        description=service.description,
        price=service.price,
        duration_minutes=service.duration_minutes,
        is_available=service.is_available,
        image_urls=service.image_urls or [],
        category=service.category,
        client_business_name=service.client.business_name if service.client else None,
        client_bio=service.client.bio if service.client else None,
        client_service_area=service.client.service_area if service.client else None,
        client_logo_url=service.client.logo_url if service.client else None,
        created_at=service.created_at
    )
