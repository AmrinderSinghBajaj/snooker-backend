from typing import Optional
from pydantic import BaseModel


class FoodItemCreate(BaseModel):
    name: str
    price: float
    image_url: Optional[str] = None


class FoodItemResponse(BaseModel):
    id: int
    name: str
    price: float
    image_url: Optional[str]

    class Config:
        from_attributes = True


class CartLine(BaseModel):
    food_item_id: int
    quantity: int = 1


class AssignOrderRequest(BaseModel):
    """FRD B.6 - Assign to Active User: cart of items linked to a session."""
    session_id: int
    lines: list[CartLine]
