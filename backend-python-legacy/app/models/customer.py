from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Customer(Base):
    """
    FRD Part B.3 - Customer Log: names entered when starting a game are
    automatically added here with a unique ID, used as a username going forward.
    """
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(120), unique=True, nullable=False, index=True)
    display_name = Column(String(120), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session_links = relationship("SessionPlayer", back_populates="customer")


class SessionPlayer(Base):
    """
    Links a Customer to a GameSession (a session can have 1-4 players).
    Tracks whether this specific player is one of the people paying,
    to support FRD's Split Billing feature.
    """
    __tablename__ = "session_players"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    is_payer = Column(Boolean, default=False)   # selected as one of the players paying the bill
    share_amount = Column(Numeric(10, 2), nullable=True)  # this player's split share

    session = relationship("GameSession", back_populates="players")
    customer = relationship("Customer", back_populates="session_links")
