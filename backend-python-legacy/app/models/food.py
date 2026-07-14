from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class FoodItem(Base):
    """
    FRD Part B.6 - Product Setup: owner builds a digital menu.
    Unlimited products, each with image, name, price.
    """
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(String(500), nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order_lines = relationship("FoodOrderLine", back_populates="food_item")


class FoodOrder(Base):
    """
    A 'bag/cart' of food items assigned to an active GameSession.
    FRD Part B.6 - Ordering & Assignment: 'Assign to Active User' button.
    """
    __tablename__ = "food_orders"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("GameSession", back_populates="food_orders")
    lines = relationship("FoodOrderLine", back_populates="order", cascade="all, delete-orphan")


class FoodOrderLine(Base):
    """A single line item (food item + qty) within a FoodOrder."""
    __tablename__ = "food_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("food_orders.id"), nullable=False)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)  # snapshot of price at time of order

    order = relationship("FoodOrder", back_populates="lines")
    food_item = relationship("FoodItem", back_populates="order_lines")

    @property
    def line_total(self):
        return float(self.unit_price) * self.quantity
