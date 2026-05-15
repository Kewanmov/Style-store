import os
import uuid
import shutil
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import func
from sqlalchemy.orm import Session

import schemas
import crud
import auth
import models
from database import get_db

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads", "products")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 МБ

# Magic bytes: (offset, bytes, extension)
_MAGIC = [
    (0, b"\xff\xd8\xff",                     "jpg"),
    (0, b"\x89PNG\r\n\x1a\n",               "png"),
    (0, b"GIF87a",                           "gif"),
    (0, b"GIF89a",                           "gif"),
    (8, b"WEBP",                             "webp"),
]

def _sniff_image_ext(data: bytes) -> str | None:
    for offset, magic, ext in _MAGIC:
        end = offset + len(magic)
        if len(data) >= end and data[offset:end] == magic:
            return ext
    return None

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
def get_stats(
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return {
        "users":    db.query(func.count(models.User.id)).scalar(),
        "products": db.query(func.count(models.Product.id)).scalar(),
        "orders":   db.query(func.count(models.Order.id)).scalar(),
        "revenue":  float(db.query(func.coalesce(func.sum(models.Order.total), 0)).scalar())
    }

@router.get("/users", response_model=List[schemas.User])
def list_users(
    skip:  int = 0,
    limit: int = 100,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.get_users(db, skip=skip, limit=limit)

@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    data: schemas.UserUpdate,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.update_user(db, user_id, data)

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.delete_user(db, user_id)

@router.get("/products", response_model=List[schemas.Product])
def list_products(
    skip:  int = 0,
    limit: int = 100,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    products = crud.get_products(db, skip=skip, limit=limit)
    return [
        {
            "id": p.id, "name": p.name, "description": p.description,
            "price": float(p.price), "stock": p.stock,
            "category_id": p.category_id,
            "image": p.image if p.image else None,
            "created_at": p.created_at,
            "category_name": p.category.name if p.category else None
        }
        for p in products
    ]

@router.post("/products", response_model=schemas.Product, status_code=201)
def create_product(
    product: schemas.ProductBase,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.create_product(db, product)

@router.put("/products/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    product: schemas.ProductBase,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.update_product(db, product_id, product)

@router.post("/products/{product_id}/upload-image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Только изображения: JPEG, PNG, WebP, GIF")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 5 МБ)")

    ext = _sniff_image_ext(contents)
    if ext is None:
        raise HTTPException(status_code=400, detail="Файл не является изображением")
    filename = f"{product_id}_{uuid.uuid4().hex[:8]}.{ext}"

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    dest = os.path.join(UPLOAD_DIR, filename)
    with open(dest, "wb") as f:
        f.write(contents)

    product.image = filename
    db.commit()
    return {"filename": filename}


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.delete_product(db, product_id)

@router.get("/orders", response_model=List[schemas.Order])
def list_all_orders(
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.get_orders(db)

@router.put("/orders/{order_id}/status", response_model=schemas.Order)
def update_order_status(
    order_id: int,
    body: schemas.OrderStatusUpdate,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.update_order_status(db, order_id, body.status.value)

@router.delete("/orders/{order_id}")
def delete_order(
    order_id: int,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"detail": "Order deleted"}

@router.get("/products/{product_id}/sizes")
def list_product_sizes(
    product_id: int,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.get_product_sizes(db, product_id)


@router.post("/products/{product_id}/sizes", status_code=201)
def add_product_size(
    product_id: int,
    body: schemas.ProductSizeWrite,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    if not crud.get_product(db, product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return crud.upsert_product_size(db, product_id, body.size, body.stock)


@router.put("/products/{product_id}/sizes/{size_id}")
def update_product_size(
    product_id: int,
    size_id: int,
    body: schemas.ProductSizeWrite,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    row = db.query(models.ProductSize).filter(
        models.ProductSize.id         == size_id,
        models.ProductSize.product_id == product_id
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Size not found")
    row.size  = body.size
    row.stock = body.stock
    db.commit()
    db.refresh(row)
    return {"id": row.id, "product_id": row.product_id, "size": row.size, "stock": row.stock}


@router.delete("/products/{product_id}/sizes/{size_id}")
def delete_product_size(
    product_id: int,
    size_id: int,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.delete_product_size(db, size_id)


@router.get("/categories", response_model=List[schemas.Category])
def list_categories(
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.get_categories(db)

@router.post("/categories", response_model=schemas.Category, status_code=201)
def create_category(
    category: schemas.CategoryBase,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.create_category(db, category)

@router.put("/categories/{category_id}", response_model=schemas.Category)
def update_category(
    category_id: int,
    data: schemas.CategoryBase,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.update_category(db, category_id, data)

@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    _=Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    return crud.delete_category(db, category_id)