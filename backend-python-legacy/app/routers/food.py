from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_admin
from app.models.asset import GameSession
from app.models.food import FoodItem, FoodOrder, FoodOrderLine
from app.schemas.food import FoodItemCreate, FoodItemResponse, AssignOrderRequest

router = APIRouter(prefix="/food", tags=["food"])


@router.get("/items", response_model=list[FoodItemResponse])
def list_food_items(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.6 - the digital menu, unlimited products."""
    return db.query(FoodItem).filter(FoodItem.is_archived == False).order_by(FoodItem.name).all()  # noqa: E712


@router.post("/items", response_model=FoodItemResponse)
def add_food_item(payload: FoodItemCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.6 - Product Setup: image, name, and price."""
    item = FoodItem(name=payload.name, price=payload.price, image_url=payload.image_url)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}")
def archive_food_item(item_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    item.is_archived = True
    db.commit()
    return {"ok": True}


@router.post("/assign")
def assign_order_to_session(payload: AssignOrderRequest, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.6 - Ordering & Assignment: owner builds a cart, then clicks
    'Assign to Active User' to link items to a player at a table.
    Cost is automatically added to that player's total bill.
    """
    session = db.query(GameSession).filter(GameSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.status not in ("running", "stopped"):
        raise HTTPException(400, "Can only assign food to an active or stopped (not yet finalized) session")

    order = FoodOrder(session_id=session.id)
    db.add(order)
    db.flush()

    added_total = 0.0
    for cart_line in payload.lines:
        item = db.query(FoodItem).filter(FoodItem.id == cart_line.food_item_id).first()
        if not item:
            raise HTTPException(404, f"Food item {cart_line.food_item_id} not found")
        line = FoodOrderLine(
            order_id=order.id,
            food_item_id=item.id,
            quantity=cart_line.quantity,
            unit_price=item.price,
        )
        db.add(line)
        added_total += float(item.price) * cart_line.quantity

    session.food_amount = float(session.food_amount) + added_total
    if session.time_amount is not None:
        session.total_amount = float(session.time_amount) + float(session.food_amount)

    db.commit()
    return {
        "order_id": order.id,
        "added_total": round(added_total, 2),
        "session_food_amount": float(session.food_amount),
    }
