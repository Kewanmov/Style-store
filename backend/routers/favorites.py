# backend/routers/favorites.py
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
import crud
import auth
from database import get_db

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/", response_model=List[schemas.FavoriteItem])
def get_favorites(
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_favorites(db, current_user.id)


@router.post("/{product_id}", status_code=201)
def add_favorite(
    product_id: int,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.add_favorite(db, current_user.id, product_id)


@router.delete("/{product_id}")
def remove_favorite(
    product_id: int,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.remove_favorite(db, current_user.id, product_id)