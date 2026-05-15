import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Base, User
from auth import get_password_hash

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    existing = db.query(User).filter(
        (User.name == "admin") | (User.email == "admin")
    ).first()

    if existing:
        db.delete(existing)
        db.commit()

    admin = User(
        name     = "admin",
        email    = "admin",
        password = get_password_hash("admin123"),
        role     = "admin"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    print(f"Admin created: id={admin.id}, login=admin, password=admin123")

except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()