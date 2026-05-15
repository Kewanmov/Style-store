import logging
import threading
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

import models
import schemas
import auth
from auth import get_password_hash

logger = logging.getLogger("style_store.crud")


def create_user(db: Session, user: schemas.UserCreate):
    existing = db.query(models.User).filter(
        models.User.email == user.email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = models.User(
        name=user.name,
        email=user.email,
        password=get_password_hash(user.password),
        phone=user.phone,
        role="user"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(
        models.User.id == user_id
    ).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(
        models.User.email == email
    ).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def update_user(db: Session, user_id: int, data: schemas.UserUpdate):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.name    is not None: user.name    = data.name
    if data.phone   is not None: user.phone   = data.phone
    if data.address is not None: user.address = data.address
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int):
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin")
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}


def create_category(db: Session, category: schemas.CategoryBase):
    existing = db.query(models.Category).filter(
        models.Category.name == category.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    db_cat = models.Category(**category.model_dump())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


def get_categories(db: Session):
    return db.query(models.Category).all()


def get_category(db: Session, category_id: int):
    return db.query(models.Category).filter(
        models.Category.id == category_id
    ).first()


def update_category(db: Session, category_id: int, data: schemas.CategoryBase):
    cat = get_category(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in data.model_dump().items():
        setattr(cat, key, value)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: int):
    cat = get_category(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return {"detail": "Category deleted"}


def create_product(db: Session, product: schemas.ProductBase):
    cat = get_category(db, product.category_id)
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def get_products(db: Session, skip: int = 0, limit: int = 100, category_id: int = None, search: str = None):
    query = db.query(models.Product).options(
        joinedload(models.Product.category)
    )
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            models.Product.name.ilike(pattern) | models.Product.description.ilike(pattern)
        )
    return query.offset(skip).limit(limit).all()


def get_product(db: Session, product_id: int):
    return (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(models.Product.id == product_id)
        .first()
    )


def get_product_sizes(db: Session, product_id: int):
    sizes = (
        db.query(models.ProductSize)
        .filter(models.ProductSize.product_id == product_id)
        .order_by(models.ProductSize.id)
        .all()
    )
    return [
        {
            "id":         s.id,
            "product_id": s.product_id,
            "size":       s.size,
            "stock":      s.stock
        }
        for s in sizes
    ]


def upsert_product_size(db: Session, product_id: int, size: str, stock: int):
    size = size.upper().strip()
    if not size or len(size) > 10:
        raise HTTPException(status_code=400, detail="Некорректный размер")
    if stock < 0:
        raise HTTPException(status_code=400, detail="Остаток не может быть отрицательным")
    row = db.query(models.ProductSize).filter(
        models.ProductSize.product_id == product_id,
        models.ProductSize.size       == size
    ).first()
    if row:
        row.stock = stock
    else:
        row = models.ProductSize(product_id=product_id, size=size, stock=stock)
        db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "product_id": row.product_id, "size": row.size, "stock": row.stock}


def delete_product_size(db: Session, size_id: int):
    row = db.query(models.ProductSize).filter(models.ProductSize.id == size_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Размер не найден")
    db.delete(row)
    db.commit()
    return {"detail": "Размер удалён"}


def update_product(db: Session, product_id: int, product: schemas.ProductBase):
    db_product = get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in product.model_dump().items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product


def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()
    return {"detail": "Product deleted"}


def add_to_cart(db: Session, user_id: int, item: schemas.CartItemBase):
    product = get_product(db, item.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    size = (item.size or "").upper().strip()

    if size:
        size_row = (
            db.query(models.ProductSize)
            .filter(
                models.ProductSize.product_id == item.product_id,
                models.ProductSize.size == size
            )
            .first()
        )
        if not size_row:
            raise HTTPException(status_code=400, detail="Размер не найден")
        if size_row.stock < item.quantity:
            raise HTTPException(status_code=400, detail="Недостаточно товара выбранного размера")
    else:
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")

    cart_item = db.query(models.CartItem).filter(
        models.CartItem.user_id    == user_id,
        models.CartItem.product_id == item.product_id,
        models.CartItem.size       == size
    ).first()

    if cart_item:
        cart_item.quantity += item.quantity
    else:
        cart_item = models.CartItem(
            user_id    = user_id,
            product_id = item.product_id,
            quantity   = item.quantity,
            size       = size
        )
        db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    return cart_item


def get_cart(db: Session, user_id: int):
    items = (
        db.query(models.CartItem)
        .options(
            joinedload(models.CartItem.product)
            .joinedload(models.Product.category)
        )
        .filter(models.CartItem.user_id == user_id)
        .all()
    )

    result = []
    for item in items:
        product = item.product
        if not product:
            continue

        result.append({
            "user_id":    item.user_id,
            "product_id": item.product_id,
            "quantity":   item.quantity,
            "size":       item.size if item.size else None,
            "product": {
                "id":            product.id,
                "name":          product.name,
                "price":         float(product.price),
                "image":         product.image if product.image else None,
                "category_name": product.category.name if product.category else None
            }
        })

    return result


def update_cart_item(db: Session, user_id: int, product_id: int, quantity: int, size: str = None):
    size = (size or "").upper().strip()
    cart_item = db.query(models.CartItem).filter(
        models.CartItem.user_id    == user_id,
        models.CartItem.product_id == product_id,
        models.CartItem.size       == size
    ).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not in cart")
    if quantity <= 0:
        db.delete(cart_item)
    else:
        if quantity > cart_item.quantity:
            product = get_product(db, product_id)
            if size and product:
                size_row = db.query(models.ProductSize).filter(
                    models.ProductSize.product_id == product_id,
                    models.ProductSize.size       == size
                ).first()
                if size_row and size_row.stock < quantity:
                    raise HTTPException(status_code=400, detail="Недостаточно товара выбранного размера")
            elif product and product.stock < quantity:
                raise HTTPException(status_code=400, detail="Not enough stock")
        cart_item.quantity = quantity
    db.commit()
    return {"detail": "Cart updated"}


def remove_from_cart(db: Session, user_id: int, product_id: int, size: str = None):
    size = (size or "").upper().strip()
    cart_item = db.query(models.CartItem).filter(
        models.CartItem.user_id    == user_id,
        models.CartItem.product_id == product_id,
        models.CartItem.size       == size
    ).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not in cart")
    db.delete(cart_item)
    db.commit()
    return {"detail": "Removed from cart"}


def clear_cart(db: Session, user_id: int):
    db.query(models.CartItem).filter(
        models.CartItem.user_id == user_id
    ).delete(synchronize_session="fetch")
    db.commit()


def create_order(db: Session, user_id: int, order: schemas.OrderCreate):
    cart_items = (
        db.query(models.CartItem)
        .filter(models.CartItem.user_id == user_id)
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total            = Decimal("0")
    order_items_data = []

    for ci in cart_items:
        # Lock the product row to prevent concurrent stock depletion
        product = (
            db.query(models.Product)
            .filter(models.Product.id == ci.product_id)
            .with_for_update()
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product {ci.product_id} not found"
            )
        if product.stock < ci.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for '{product.name}'"
            )
        if ci.size:
            size_row = (
                db.query(models.ProductSize)
                .filter(
                    models.ProductSize.product_id == ci.product_id,
                    models.ProductSize.size       == ci.size
                )
                .with_for_update()
                .first()
            )
            if size_row:
                if size_row.stock < ci.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Недостаточно товара '{product.name}' размера {ci.size}"
                    )
                size_row.stock -= ci.quantity
        price      = product.price if isinstance(product.price, Decimal) else Decimal(str(product.price))
        item_total = price * ci.quantity
        total     += item_total
        order_items_data.append({
            "product_id":        ci.product_id,
            "quantity":          ci.quantity,
            "price_at_purchase": float(price),
            "size":              ci.size
        })
        product.stock -= ci.quantity

    db_order = models.Order(
        user_id          = user_id,
        total            = float(total.quantize(Decimal("0.01"))),
        shipping_address = order.shipping_address,
        comment          = order.comment or None,
        customer_name    = order.customer_name or None,
        phone            = order.phone or None,
        payment_method   = order.payment_method.value if order.payment_method else "on_delivery",
        delivery_method  = order.delivery_method.value if order.delivery_method else "courier",
    )
    db.add(db_order)
    db.flush()

    for oi_data in order_items_data:
        db.add(models.OrderItem(order_id=db_order.id, **oi_data))

    clear_cart(db, user_id)
    db.commit()
    db.refresh(db_order)
    logger.info("Order #%d created for user #%d, total=%.2f", db_order.id, user_id, float(db_order.total))

    user = get_user(db, user_id)
    if user and user.email:
        threading.Thread(
            target=auth.send_order_confirmation,
            args=(user.email, db_order.id, float(db_order.total), order_items_data, db_order.delivery_method),
            daemon=True
        ).start()

    return db_order


def get_orders(db: Session, user_id: int = None):
    query = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items)
            .joinedload(models.OrderItem.product)
        )
    )
    if user_id:
        query = query.filter(models.Order.user_id == user_id)
    return query.order_by(models.Order.created_at.desc()).all()


def get_order(db: Session, order_id: int):
    return (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items)
            .joinedload(models.OrderItem.product)
        )
        .filter(models.Order.id == order_id)
        .first()
    )


def update_order_status(db: Session, order_id: int, status: str):
    db_order = get_order(db, order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    if status == "cancelled" and db_order.status != "cancelled":
        for item in db_order.items:
            product = get_product(db, item.product_id)
            if product:
                product.stock += item.quantity
            if item.size:
                size_row = (
                    db.query(models.ProductSize)
                    .filter(
                        models.ProductSize.product_id == item.product_id,
                        models.ProductSize.size       == item.size
                    )
                    .first()
                )
                if size_row:
                    size_row.stock += item.quantity

    db_order.status = status
    db.commit()
    db.refresh(db_order)
    return db_order


def get_favorites(db: Session, user_id: int):
    favs = (
        db.query(models.Favorite)
        .options(joinedload(models.Favorite.product))
        .filter(models.Favorite.user_id == user_id)
        .all()
    )
    result = []
    for fav in favs:
        p = fav.product
        if not p:
            continue
        result.append({
            "id":    p.id,
            "name":  p.name,
            "price": float(p.price),
            "image": p.image if p.image else None
        })
    return result


def add_favorite(db: Session, user_id: int, product_id: int):
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id    == user_id,
        models.Favorite.product_id == product_id
    ).first()
    if existing:
        return {"detail": "Already in favorites"}

    fav = models.Favorite(user_id=user_id, product_id=product_id)
    db.add(fav)
    db.commit()
    return {"detail": "Added to favorites"}


def remove_favorite(db: Session, user_id: int, product_id: int):
    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id    == user_id,
        models.Favorite.product_id == product_id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Not in favorites")
    db.delete(fav)
    db.commit()
    return {"detail": "Removed from favorites"}