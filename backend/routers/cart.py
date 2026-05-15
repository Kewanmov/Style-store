from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session

import schemas
import crud
import auth
from database import get_db

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("/")
def get_cart(
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_cart(db, current_user.id)


@router.post("/", status_code=201)
def add_to_cart(
    item: schemas.CartItemBase,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.add_to_cart(db, current_user.id, item)


@router.put("/{product_id}")
def update_cart_item(
    product_id: int,
    data: schemas.CartItemQuantityUpdate,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.update_cart_item(db, current_user.id, product_id, data.quantity, data.size)


@router.delete("/{product_id}")
def remove_from_cart(
    product_id: int,
    size: Optional[str] = Query(default=None),
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.remove_from_cart(db, current_user.id, product_id, size)


@router.delete("/")
def clear_cart(
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    crud.clear_cart(db, current_user.id)
    return {"detail": "Cart cleared"}