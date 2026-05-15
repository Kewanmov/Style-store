# STYLE — Интернет-магазин одежды

Учебный проект по дисциплине «УП-0.5». Полноценный интернет-магазин одежды с каталогом, корзиной, оформлением заказов и панелью администратора.

## Стек технологий

**Frontend**
- Vanilla JavaScript (ES6+), без фреймворков
- Tailwind CSS (CDN) + собственные CSS-файлы
- Статические HTML-страницы, раздаются через OSPanel

**Backend**
- Python 3.11+, FastAPI
- SQLAlchemy ORM + Alembic (миграции)
- MySQL (PyMySQL)
- JWT-аутентификация (python-jose + bcrypt)
- Slowapi (rate limiting)

**Интеграции**
- ЮKassa — онлайн-оплата
- SMTP — письма (подтверждение заказа, сброс пароля)

## Возможности

- Каталог товаров с фильтрацией по категориям, поиском и пагинацией
- Карточка товара: галерея, выбор размера, количество, избранное
- Корзина с управлением количеством
- Оформление заказа: адрес, способ доставки, способ оплаты
- Онлайн-оплата через ЮKassa с вебхуком
- Личный кабинет: история заказов, отмена, избранное, история просмотров
- Загрузка аватара пользователя
- Смена пароля и сброс по email
- Панель администратора: товары, категории, заказы, пользователи, статистика
- Загрузка изображений товаров с проверкой magic bytes

## Структура проекта

```
style_store/
├── backend/               # FastAPI-приложение
│   ├── main.py            # Точка входа, CORS, middleware
│   ├── models.py          # SQLAlchemy-модели
│   ├── schemas.py         # Pydantic-схемы
│   ├── crud.py            # Операции с БД
│   ├── auth.py            # JWT, bcrypt, email
│   ├── database.py        # Подключение к MySQL
│   ├── routers/           # Роутеры по ресурсам
│   │   ├── users.py
│   │   ├── products.py
│   │   ├── cart.py
│   │   ├── orders.py
│   │   ├── favorites.py
│   │   ├── admin.py
│   │   └── payments.py
│   ├── uploads/           # Загруженные изображения
│   │   ├── products/
│   │   └── avatars/
│   └── alembic/           # Миграции БД
├── main/                  # JavaScript-файлы
├── style/                 # CSS-файлы
├── *.html                 # Страницы
├── .env.example           # Пример конфигурации
├── requirements.txt
└── robots.txt
```

## Быстрый старт

**1. Клонировать репозиторий**
```bash
git clone https://github.com/<username>/style-store.git
cd style-store
```

**2. Настроить окружение**
```bash
cp .env.example .env
# Отредактировать .env: DATABASE_URL, SECRET_KEY, SMTP_*, YOOKASSA_*
```

**3. Установить зависимости и запустить бэкенд**
```bash
pip install -r requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```

**4. Создать администратора**
```bash
python backend/seed_admin.py
```

**5. Открыть frontend**

Поместите папку проекта в корень веб-сервера (OSPanel, XAMPP и т.п.) и откройте `http://custom.local` или `http://localhost`.

## API

Документация доступна после запуска: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Основные эндпоинты:

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/users/register` | Регистрация |
| POST | `/users/login` | Вход (JWT) |
| GET | `/products/` | Список товаров |
| GET | `/cart/` | Корзина |
| POST | `/orders/` | Оформить заказ |
| POST | `/payments/create/{id}` | Создать платёж |
| GET | `/admin/stats` | Статистика (admin) |

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Строка подключения к MySQL |
| `SECRET_KEY` | Секрет для JWT (обязателен в production) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Срок жизни токена (по умолчанию 1440) |
| `ALLOWED_ORIGINS` | CORS-список через запятую |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP для писем |
| `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` | Ключи ЮKassa |
| `FRONTEND_URL` | URL фронтенда (для ссылок в письмах) |
| `ENV` | `development` или `production` |

## Об авторе

Проект выполнен в рамках учебной практики. Реализован полный цикл разработки: проектирование БД, REST API, клиентская часть, аутентификация, интеграция платёжной системы.
