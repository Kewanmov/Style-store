import re
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Role(str, Enum):
    user  = "user"
    admin = "admin"


class OrderStatus(str, Enum):
    new        = "new"
    processing = "processing"
    shipped    = "shipped"
    delivered  = "delivered"
    cancelled  = "cancelled"


class PaymentMethod(str, Enum):
    online      = "online"
    on_delivery = "on_delivery"


class DeliveryMethod(str, Enum):
    courier = "courier"
    pickup  = "pickup"
    post    = "post"


class UserBase(BaseModel):
    name:  str
    email: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Имя минимум 3 символа")
        if len(v) > 30:
            raise ValueError("Имя максимум 30 символов")
        if not re.match(r"^[\w\-. А-Яа-яЁё]+$", v):
            raise ValueError("Имя содержит недопустимые символы")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль минимум 6 символов")
        if len(v) > 100:
            raise ValueError("Пароль слишком длинный")
        return v

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not re.match(r"^[\d+() \-]{10,18}$", v):
            raise ValueError("Некорректный номер телефона")
        return v


class UserUpdate(BaseModel):
    name:    Optional[str] = None
    phone:   Optional[str] = None
    address: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Имя не может быть пустым")
        if len(v) > 100:
            raise ValueError("Имя максимум 100 символов")
        return v

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not re.match(r"^[\d+() \-]{10,18}$", v):
            raise ValueError("Некорректный номер телефона")
        return v


class User(UserBase):
    id:         int
    role:       Role
    created_at: datetime
    address:    Optional[str] = None
    avatar:     Optional[str] = None

    class Config:
        from_attributes = True


class Login(BaseModel):
    email:    str
    password: str

    @field_validator("email")
    @classmethod
    def login_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Логин не может быть пустым")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("Пароль не может быть пустым")
        return v


class Token(BaseModel):
    access_token: str
    token_type:   str


class CategoryBase(BaseModel):
    name:        str
    description: Optional[str] = None
    parent_id:   Optional[int] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Название категории не может быть пустым")
        if len(v) > 100:
            raise ValueError("Название максимум 100 символов")
        return v


class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name:        str
    description: Optional[str] = None
    price:       float
    stock:       int
    category_id: int
    image:       Optional[str] = None

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Цена не может быть отрицательной")
        return v

    @field_validator("stock")
    @classmethod
    def stock_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Остаток не может быть отрицательным")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Название товара не может быть пустым")
        return v


class ProductSizeWrite(BaseModel):
    size:  str
    stock: int = 0

    @field_validator("size")
    @classmethod
    def size_not_empty(cls, v: str) -> str:
        v = v.strip().upper()
        if not v or len(v) > 10:
            raise ValueError("Размер: от 1 до 10 символов")
        return v

    @field_validator("stock")
    @classmethod
    def stock_non_neg(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Остаток не может быть отрицательным")
        return v


class ProductSizeItem(BaseModel):
    id:         int
    product_id: int
    size:       str
    stock:      int

    class Config:
        from_attributes = True


class ProductInCart(BaseModel):
    id:            int
    name:          str
    price:         float
    image:         Optional[str] = None
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


class Product(ProductBase):
    id:            int
    created_at:    datetime
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


class CartItemBase(BaseModel):
    product_id: int
    quantity:   int = 1
    size:       Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Количество минимум 1")
        if v > 100:
            raise ValueError("Количество максимум 100")
        return v


class CartItemQuantityUpdate(BaseModel):
    quantity: int
    size:     Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def quantity_valid(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Количество не может быть отрицательным")
        if v > 100:
            raise ValueError("Количество максимум 100")
        return v


class CartItem(CartItemBase):
    user_id: int
    product: Optional[ProductInCart] = None

    class Config:
        from_attributes = True


class OrderItemBase(BaseModel):
    product_id:        int
    quantity:          int
    price_at_purchase: float


class OrderItem(OrderItemBase):
    id:           int
    order_id:     int
    product_name: Optional[str] = None
    size:         Optional[str] = None

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, '__dict__'):
            data = {
                "id":                obj.id,
                "order_id":          obj.order_id,
                "product_id":        obj.product_id,
                "quantity":          obj.quantity,
                "price_at_purchase": float(obj.price_at_purchase),
                "product_name":      obj.product.name if obj.product else None,
                "size":              obj.size if hasattr(obj, 'size') else None
            }
            return cls(**data)
        return super().model_validate(obj, *args, **kwargs)

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    shipping_address: str
    comment:          Optional[str] = None

    @field_validator("shipping_address")
    @classmethod
    def address_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Адрес доставки обязателен")
        if len(v) > 200:
            raise ValueError("Адрес максимум 200 символов")
        return v


class OrderCreate(OrderBase):
    customer_name:   Optional[str]      = None
    phone:           Optional[str]      = None
    payment_method:  PaymentMethod      = PaymentMethod.on_delivery
    delivery_method: DeliveryMethod     = DeliveryMethod.courier
    items:           List[CartItemBase] = []


class Order(OrderBase):
    id:              int
    user_id:         int
    status:          OrderStatus
    total:           float
    created_at:      datetime
    payment_method:  Optional[PaymentMethod]  = None
    delivery_method: Optional[DeliveryMethod] = None
    phone:           Optional[str]            = None
    customer_name:   Optional[str]            = None
    items:           List[OrderItem]          = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v or "@" not in v:
            raise ValueError("Некорректный email")
        return v.lower()


class ResetPasswordRequest(BaseModel):
    token:    str
    password: str

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль минимум 6 символов")
        if len(v) > 100:
            raise ValueError("Пароль слишком длинный")
        return v


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль минимум 6 символов")
        if len(v) > 100:
            raise ValueError("Пароль слишком длинный")
        return v


class FavoriteItem(BaseModel):
    id:    int
    name:  str
    price: float
    image: Optional[str] = None

    class Config:
        from_attributes = True