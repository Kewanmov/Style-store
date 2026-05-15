import os
import uuid
import ipaddress
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

import crud
import auth
import models
from database import get_db

logger = logging.getLogger("style_store.payments")

router = APIRouter(prefix="/payments", tags=["payments"])

YOOKASSA_SHOP_ID  = os.getenv("YOOKASSA_SHOP_ID", "")
YOOKASSA_SECRET   = os.getenv("YOOKASSA_SECRET_KEY", "")
FRONTEND_URL      = os.getenv("FRONTEND_URL", "http://custom.local")

# YooKassa server IP ranges (https://yookassa.ru/developers/using-api/webhooks)
_YOOKASSA_IP_NETS = [
    ipaddress.ip_network("185.71.76.0/27"),
    ipaddress.ip_network("185.71.77.0/27"),
    ipaddress.ip_network("77.75.153.0/25"),
    ipaddress.ip_network("77.75.156.11/32"),
    ipaddress.ip_network("77.75.156.35/32"),
    ipaddress.ip_network("54.229.100.0/26"),
]

_yookassa_ready = bool(YOOKASSA_SHOP_ID and YOOKASSA_SECRET)

if _yookassa_ready:
    try:
        from yookassa import Configuration, Payment
        Configuration.account_id = YOOKASSA_SHOP_ID
        Configuration.secret_key = YOOKASSA_SECRET
    except ImportError:
        _yookassa_ready = False
        logger.warning("yookassa package not installed — payment creation disabled")


@router.post("/create/{order_id}")
def create_payment(
    order_id: int,
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not _yookassa_ready:
        raise HTTPException(
            status_code=503,
            detail="Онлайн-оплата не настроена. Добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env"
        )

    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    if order.payment_method != "online":
        raise HTTPException(status_code=400, detail="Заказ не требует онлайн-оплаты")
    if order.status not in ("new", "processing"):
        raise HTTPException(status_code=400, detail="Заказ уже обработан")

    from yookassa import Payment
    idempotency_key = str(uuid.uuid4())

    payment = Payment.create({
        "amount": {
            "value":    f"{float(order.total):.2f}",
            "currency": "RUB"
        },
        "confirmation": {
            "type":       "redirect",
            "return_url": f"{FRONTEND_URL}/profile.html"
        },
        "description": f"Заказ #{order_id} — STYLE",
        "metadata":    {"order_id": str(order_id)},
        "capture":     True
    }, idempotency_key)

    logger.info("Payment created for order #%d, payment_id=%s", order_id, payment.id)
    return {"payment_id": payment.id, "confirmation_url": payment.confirmation.confirmation_url}


def _is_yookassa_ip(request: Request) -> bool:
    client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if not client_ip:
        client = request.client
        client_ip = client.host if client else ""
    try:
        addr = ipaddress.ip_address(client_ip)
        return any(addr in net for net in _YOOKASSA_IP_NETS)
    except ValueError:
        return False


@router.post("/webhook")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    env = os.getenv("ENV", "development")
    if env == "production" and not _is_yookassa_ip(request):
        logger.warning("Webhook rejected: unknown IP %s", request.client.host if request.client else "?")
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event  = body.get("event", "")
    obj    = body.get("object", {})
    status = obj.get("status", "")
    meta   = obj.get("metadata", {})

    logger.info("YooKassa webhook: event=%s status=%s", event, status)

    if event == "payment.succeeded" and status == "succeeded":
        order_id = meta.get("order_id")
        if order_id:
            try:
                order_id = int(order_id)
                crud.update_order_status(db, order_id, "processing")
                logger.info("Order #%d marked as processing after payment", order_id)
            except Exception as e:
                logger.error("Failed to update order #%s: %s", order_id, e)

    return {"status": "ok"}
