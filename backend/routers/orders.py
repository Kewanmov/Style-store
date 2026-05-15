from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import schemas
import crud
import auth
from database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=schemas.Order, status_code=201)
def create_order(
    order_data: schemas.OrderCreate,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.create_order(db, current_user.id, order_data)


@router.get("/", response_model=List[schemas.Order])
def get_my_orders(
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_orders(db, user_id=current_user.id)


@router.get("/{order_id}", response_model=schemas.Order)
def get_order(
    order_id: int,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    return order


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    if order.status not in ("new",):
        raise HTTPException(status_code=400, detail="Отменить можно только новый заказ")
    return crud.update_order_status(db, order_id, "cancelled")