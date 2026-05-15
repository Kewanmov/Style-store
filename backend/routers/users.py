import os
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

import schemas
import crud
import auth
import models
from database import get_db

AVATAR_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads", "avatars")
_AVATAR_MAGIC = [
    (0, b"\xff\xd8\xff",       "jpg"),
    (0, b"\x89PNG\r\n\x1a\n", "png"),
    (8, b"WEBP",               "webp"),
]

def _sniff_image_ext(data: bytes):
    for offset, magic, ext in _AVATAR_MAGIC:
        end = offset + len(magic)
        if len(data) >= end and data[offset:end] == magic:
            return ext
    return None

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=schemas.User, status_code=201)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db, user)


@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, form_data: schemas.Login, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )
    access_token = auth.create_access_token(
        data={"sub": user.email if user.email != user.name else user.name},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.User)
def get_me(current_user=Depends(auth.get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.User)
def update_me(
    data: schemas.UserUpdate,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return crud.update_user(db, current_user.id, data)


@router.put("/me/password")
def change_password(
    data: schemas.ChangePasswordRequest,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not auth.verify_password(data.old_password, current_user.password):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    current_user.password = auth.get_password_hash(data.new_password)
    db.commit()
    return {"detail": "Пароль изменён"}


@router.post("/me/avatar", response_model=schemas.User)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 2 МБ)")
    ext = _sniff_image_ext(contents)
    if not ext:
        raise HTTPException(status_code=400, detail="Только изображения: JPEG, PNG, WebP")
    os.makedirs(AVATAR_DIR, exist_ok=True)
    filename = f"user_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    with open(os.path.join(AVATAR_DIR, filename), "wb") as f:
        f.write(contents)
    current_user.avatar = filename
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
def forgot_password(data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    # Не раскрываем факт существования email
    if not user:
        return {"detail": "Если email зарегистрирован, на него отправлена инструкция"}

    token = auth.create_reset_token(db, user.email)
    frontend_url = os.getenv("FRONTEND_URL", "http://custom.local")
    reset_link = f"{frontend_url}/reset-password.html?token={token}"

    sent = auth.send_reset_email(user.email, reset_link)

    if not sent:
        # В dev-режиме возвращаем ссылку прямо в ответе
        if os.getenv("ENV", "development") != "production":
            return {"detail": "Email не настроен. Dev-ссылка:", "reset_link": reset_link}

    return {"detail": "Если email зарегистрирован, на него отправлена инструкция"}


@router.post("/reset-password")
def reset_password(data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email = auth.consume_reset_token(db, data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Ссылка недействительна или истекла")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.password = auth.get_password_hash(data.password)
    db.commit()
    return {"detail": "Пароль успешно изменён"}