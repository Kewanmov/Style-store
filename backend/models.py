from sqlalchemy import Column, Integer, String, Text, DECIMAL, Enum, ForeignKey, TIMESTAMP, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(100), nullable=False)
    email      = Column(String(100), unique=True, nullable=False)
    password   = Column(String(255), nullable=False)
    phone      = Column(String(20), default=None)
    address    = Column(String(255), default=None)
    avatar     = Column(String(255), default=None)
    role       = Column(Enum("user", "admin"), nullable=False, default="user")
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)

    orders     = relationship("Order",    back_populates="user", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    favorites  = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(100), unique=True, nullable=False)
    description = Column(Text, default=None)
    parent_id   = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), default=None)

    parent   = relationship("Category", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(200), nullable=False)
    description = Column(Text, default=None)
    price       = Column(DECIMAL(10, 2), nullable=False, default=0)
    stock       = Column(Integer, nullable=False, default=0)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    image       = Column(String(255), default=None)
    created_at  = Column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)

    category    = relationship("Category", back_populates="products")
    cart_items  = relationship("CartItem",  back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
    favorites   = relationship("Favorite",  back_populates="product", cascade="all, delete-orphan")
    sizes       = relationship("ProductSize", back_populates="product", cascade="all, delete-orphan")


class ProductSize(Base):
    __tablename__ = "product_sizes"
    __table_args__ = (
        Index("ix_product_sizes_product_id", "product_id"),
    )

    id         = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    size       = Column(String(10), nullable=False)
    stock      = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="sizes")


class CartItem(Base):
    __tablename__  = "cart_items"

    user_id    = Column(Integer, ForeignKey("users.id",    ondelete="CASCADE"), primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    size       = Column(String(10), primary_key=True, nullable=False, server_default="")
    quantity   = Column(Integer, nullable=False, default=1)

    user    = relationship("User",    back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_user_id", "user_id"),
    )

    id               = Column(Integer, primary_key=True, autoincrement=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status           = Column(
        Enum("new", "processing", "shipped", "delivered", "cancelled"),
        nullable=False, default="new"
    )
    total            = Column(DECIMAL(10, 2), nullable=False, default=0)
    shipping_address = Column(Text, nullable=False)
    comment          = Column(Text, default=None)
    customer_name    = Column(String(100), default=None)
    phone            = Column(String(20), default=None)
    payment_method   = Column(
        Enum("online", "on_delivery"),
        nullable=False, default="on_delivery"
    )
    delivery_method  = Column(
        Enum("courier", "pickup", "post"),
        nullable=False, default="courier"
    )
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)

    user  = relationship("User",      back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        Index("ix_order_items_order_id", "order_id"),
    )

    id                = Column(Integer, primary_key=True, autoincrement=True)
    order_id          = Column(Integer, ForeignKey("orders.id",   ondelete="CASCADE"),  nullable=False)
    product_id        = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity          = Column(Integer, nullable=False, default=1)
    price_at_purchase = Column(DECIMAL(10, 2), nullable=False)
    size              = Column(String(10), default=None)

    order   = relationship("Order",   back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Favorite(Base):
    __tablename__ = "favorites"

    user_id    = Column(Integer, ForeignKey("users.id",    ondelete="CASCADE"), primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    added_at   = Column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)

    user    = relationship("User",    back_populates="favorites")
    product = relationship("Product", back_populates="favorites")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token      = Column(String(64), primary_key=True)
    email      = Column(String(100), nullable=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    used       = Column(Integer, nullable=False, default=0)  # 0=valid, 1=consumed