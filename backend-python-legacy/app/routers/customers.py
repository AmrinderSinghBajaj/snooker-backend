from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.deps import get_current_admin
from app.models.customer import Customer

router = APIRouter(prefix="/customers", tags=["customers"])


class CustomerResponse(BaseModel):
    id: int
    username: str
    display_name: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.3 footnote - Customer Log / Customer Management list."""
    return db.query(Customer).order_by(Customer.created_at.desc()).all()
