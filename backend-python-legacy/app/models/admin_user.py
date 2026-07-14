from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class AdminUser(Base):
    """
    The Club Owner login (Admin Panel).
    FRD Part B.1 - Login Layout: Username and Password login method.
    """
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False, default="Club Owner")
    club_name = Column(String(120), nullable=False, default="The Billiards Arena")
    role = Column(String(50), nullable=False, default="Club Owner")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
