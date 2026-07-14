"""
Run once after deploying, to create the first Club Owner login.

Usage:
    python seed_admin.py

Reads club name / owner name / username / password from app/club_config.py
(the single white-label config file). Environment variables, if set, take
priority over the config file - handy for CI/CD pipelines that inject
secrets at deploy time without editing source.
"""
import os
from app.database import SessionLocal, Base, engine
from app.models.admin_user import AdminUser
from app.security import hash_password
from app import club_config

Base.metadata.create_all(bind=engine)

db = SessionLocal()

username = os.getenv("ADMIN_USERNAME", club_config.OWNER_USERNAME)
password = os.getenv("ADMIN_PASSWORD", club_config.OWNER_PASSWORD)
full_name = os.getenv("ADMIN_FULL_NAME", club_config.OWNER_FULL_NAME)
club_name = os.getenv("ADMIN_CLUB_NAME", club_config.CLUB_NAME)

existing = db.query(AdminUser).filter(AdminUser.username == username).first()
if existing:
    print(f"Admin user '{username}' already exists. Skipping.")
else:
    admin = AdminUser(
        username=username,
        hashed_password=hash_password(password),
        full_name=full_name,
        club_name=club_name,
        role="Club Owner",
    )
    db.add(admin)
    db.commit()
    print(f"Created admin user '{username}'. Please log in and consider rotating the password.")

db.close()
