from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import schemas
import crud
from database import get_db

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[schemas.Product])
def list_products(
    skip:        int           = Query(0,   ge=0),
    limit:       int           = Query(50,  ge=1, le=200),
    category_id: Optional[int] = None,
    search:      Optional[str] = Query(None, max_length=100),
    db:          Session       = Depends(get_db)
):
    products = crud.get_products(db, skip=skip, limit=limit, category_id=category_id, search=search)
    result = []
    for p in products:
        result.append({
            "id":            p.id,
            "name":          p.name,
            "description":   p.description,
            "price":         float(p.price),
            "stock":         p.stock,
            "category_id":   p.category_id,
            "image":         p.image if p.image else None,
            "created_at":    p.created_at,
            "category_name": p.category.name if p.category else None
        })
    return result


@router.get("/categories", response_model=List[schemas.Category])
def list_categories(db: Session = Depends(get_db)):
    return crud.get_categories(db)


@router.get("/{product_id}/sizes")
def get_product_sizes(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    sizes = crud.get_product_sizes(db, product_id)
    return sizes


@router.get("/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id":            product.id,
        "name":          product.name,
        "description":   product.description,
        "price":         float(product.price),
        "stock":         product.stock,
        "category_id":   product.category_id,
        "image":         product.image if product.image else None,
        "created_at":    product.created_at,
        "category_name": product.category.name if product.category else None
    }