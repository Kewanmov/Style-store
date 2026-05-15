import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
from database import get_db

SECRET_KEY = os.getenv("SECRET_KEY")
ENV = os.getenv("ENV", "development")

if not SECRET_KEY:
    if ENV == "production":
        raise RuntimeError("SECRET_KEY is required in production. Set it in .env")
    SECRET_KEY = "dev-only-insecure-key-change-in-production"
    print("⚠️  Using insecure dev SECRET_KEY. Set SECRET_KEY in .env for production.")

ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))

pwd_context  = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def authenticate_user(db: Session, login: str, password: str):
    user = (
        db.query(models.User)
        .filter(
            (models.User.email == login) | (models.User.name == login)
        )
        .first()
    )
    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire    = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str        = Depends(oauth2_scheme),
    db:    Session    = Depends(get_db)
):
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            raise exc
    except JWTError:
        raise exc

    user = (
        db.query(models.User)
        .filter(
            (models.User.email == sub) | (models.User.name == sub)
        )
        .first()
    )
    if user is None:
        raise exc
    return user


RESET_TOKEN_EXPIRE_MINUTES = 30


def create_reset_token(db, user_email: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    # purge expired tokens for this email to avoid stale rows building up
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == user_email
    ).delete(synchronize_session=False)
    row = models.PasswordResetToken(token=token, email=user_email, expires_at=expires_at)
    db.add(row)
    db.commit()
    return token


def validate_reset_token(db, token: str) -> Optional[str]:
    row = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used  == 0
    ).first()
    if not row:
        return None
    if datetime.utcnow() > row.expires_at:
        db.delete(row)
        db.commit()
        return None
    return row.email


def consume_reset_token(db, token: str) -> Optional[str]:
    row = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used  == 0
    ).first()
    if not row:
        return None
    if datetime.utcnow() > row.expires_at:
        db.delete(row)
        db.commit()
        return None
    email = row.email
    db.delete(row)
    db.commit()
    return email


def send_order_confirmation(to_email: str, order_id: int, total: float, items: list, delivery: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_user = os.getenv("SMTP_USER", "")
    if not smtp_host or not smtp_user:
        return False

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    delivery_labels = {"courier": "Курьером", "pickup": "Пункт выдачи", "post": "Почта России"}
    delivery_label = delivery_labels.get(delivery, delivery)

    items_rows = ""
    for item in items:
        size_str = f" (р. {item['size']})" if item.get("size") else ""
        items_rows += f"<tr><td>{item['product_id']}{size_str}</td><td style='text-align:center'>{item['quantity']}</td><td style='text-align:right'>{item['price_at_purchase']:.2f} ₽</td></tr>"

    html = f"""<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto">
<h2 style="color:#722f37">Заказ #{order_id} принят!</h2>
<p>Спасибо за покупку в магазине <strong>STYLE</strong>.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<thead><tr style="background:#f5f0eb">
<th style="text-align:left;padding:8px">Товар</th>
<th style="padding:8px">Кол-во</th>
<th style="text-align:right;padding:8px">Цена</th>
</tr></thead>
<tbody>{items_rows}</tbody>
<tfoot><tr style="border-top:2px solid #e5e7eb">
<td colspan="2" style="padding:8px;font-weight:700">Итого</td>
<td style="text-align:right;padding:8px;font-weight:700">{total:.2f} ₽</td>
</tr></tfoot>
</table>
<p><strong>Доставка:</strong> {delivery_label}</p>
<p style="color:#888;font-size:12px">Это автоматическое письмо, не отвечайте на него.</p>
</div>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Заказ #{order_id} принят — STYLE"
    msg["From"]    = smtp_from
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo(); server.starttls(); server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"Order email error: {e}")
        return False


def send_reset_email(to_email: str, reset_link: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    if not smtp_host or not smtp_user:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Сброс пароля — STYLE"
    msg["From"]    = smtp_from
    msg["To"]      = to_email

    text = f"Для сброса пароля перейдите по ссылке:\n{reset_link}\n\nСсылка действительна 30 минут."
    html = f"""<p>Для сброса пароля нажмите кнопку ниже:</p>
<p><a href="{reset_link}" style="background:#722f37;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Сбросить пароль</a></p>
<p style="color:#999;font-size:12px">Ссылка действительна 30 минут. Если вы не запрашивали сброс — проигнорируйте это письмо.</p>"""

    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"SMTP error: {e}")
        return False


async def get_current_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user