from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class StopGameResponse(BaseModel):
    session_id: int
    minutes_played: float
    time_amount: float
    food_amount: float
    total_amount: float


class SplitBillingRequest(BaseModel):
    """FRD B.4 - owner selects which players (customer ids) are paying."""
    payer_customer_ids: list[int]


class SplitBillingResponse(BaseModel):
    session_id: int
    total_amount: float
    payers: list[dict]   # [{customer_id, name, share_amount}]


class FinalizeSessionRequest(BaseModel):
    """Clicking 'Done' - moves the record to Billing Section."""
    pass


class UnpaidRequest(BaseModel):
    """FRD B.4 - Unpaid box asks for Paid Amount and Pending Amount."""
    paid_amount: float
    pending_amount: float


class BillingRecordResponse(BaseModel):
    session_id: int
    serial_number: int
    player_names: list[str]
    time_played_minutes: float
    food_amount: float
    total_amount: float
    payment_status: Optional[str]
    paid_amount: float
    pending_amount: float
    start_time: Optional[datetime]
    stop_time: Optional[datetime]
    asset_label: str
    is_manual_entry: bool = False
    was_edited: bool = False

    class Config:
        from_attributes = True


class SessionDetailResponse(BaseModel):
    """'See Detail' button - exact start/end times + food breakdown."""
    session_id: int
    serial_number: int
    asset_label: str
    player_names: list[str]
    start_time: Optional[datetime]
    stop_time: Optional[datetime]
    minutes_played: float
    time_amount: float
    food_amount: float
    total_amount: float
    food_lines: list[dict]   # [{name, quantity, unit_price, line_total}]
    payment_status: Optional[str]
    paid_amount: float
    pending_amount: float


class EditBillingRecordRequest(BaseModel):
    """
    Owner-facing edit of an existing billing row. Fully free-form by design:
    the most common real-world case is the table was stopped under one
    player's name but a different player/group ends up actually paying, so
    every field is independently optional and only supplied fields change.
    """
    asset_label_override: Optional[str] = None
    player_names: Optional[list[str]] = None
    start_time: Optional[datetime] = None
    stop_time: Optional[datetime] = None
    food_amount: Optional[float] = None
    total_amount: Optional[float] = None
    payment_status: Optional[str] = None   # "paid" | "unpaid"
    paid_amount: Optional[float] = None
    pending_amount: Optional[float] = None


class ManualBillingEntryRequest(BaseModel):
    """
    A from-scratch billing row the owner types in directly, for situations
    that never went through Start/Stop (e.g. a missed entry from last night,
    a phone booking settled in cash). Mirrors a real session's shape.
    """
    asset_label: str                 # free text, e.g. "Table 2" or "Walk-in"
    player_names: list[str]
    start_time: datetime
    stop_time: datetime
    food_amount: float = 0
    total_amount: float
    payment_status: str = "unpaid"   # "paid" | "unpaid"
    paid_amount: float = 0
    pending_amount: float = 0
