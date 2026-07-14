from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.deps import get_current_admin
from app.models.asset import GameSession, AssetStatus
from app.models.customer import SessionPlayer, Customer
from app.schemas.billing import (
    StopGameResponse, SplitBillingRequest, SplitBillingResponse,
    UnpaidRequest, BillingRecordResponse, SessionDetailResponse,
    EditBillingRecordRequest, ManualBillingEntryRequest,
)

router = APIRouter(prefix="/billing", tags=["billing"])


def _compute_time_amount(session: GameSession) -> tuple[float, float]:
    """
    FRD B.4 - Price Calculation: minutes played x rate.
    Example: 30 minutes at Rs 6/min = Rs 180.
    Manual entries (no linked asset) skip this - their amounts are typed in directly.
    """
    end = session.stop_time or datetime.utcnow()
    minutes = max((end - session.start_time).total_seconds() / 60.0, 0)
    if not session.asset:
        return round(minutes, 2), float(session.time_amount or 0)
    per_minute_rate = float(session.asset.hourly_rate) / 60.0
    amount = round(minutes * per_minute_rate, 2)
    return round(minutes, 2), amount


@router.post("/{session_id}/stop", response_model=StopGameResponse)
def stop_game(session_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.4 - Red 'Stop' button: timer pauses, cost is calculated."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.status != "running":
        raise HTTPException(400, "Session is not currently running")

    session.stop_time = datetime.utcnow()
    session.status = "stopped"
    minutes, time_amount = _compute_time_amount(session)
    session.time_amount = time_amount
    session.total_amount = round(time_amount + float(session.food_amount), 2)

    session.asset.status = AssetStatus.STOPPED
    db.commit()

    return StopGameResponse(
        session_id=session.id,
        minutes_played=minutes,
        time_amount=time_amount,
        food_amount=float(session.food_amount),
        total_amount=float(session.total_amount),
    )


@router.post("/{session_id}/split", response_model=SplitBillingResponse)
def split_billing(session_id: int, payload: SplitBillingRequest, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.4 - Split Billing: owner selects which players are paying.
    1 payer -> full amount. 2 payers -> each pays half. Etc (even split across selected payers).
    """
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if not payload.payer_customer_ids:
        raise HTTPException(400, "Select at least one paying player")

    links = db.query(SessionPlayer).filter(SessionPlayer.session_id == session_id).all()
    valid_ids = {link.customer_id for link in links}
    for cid in payload.payer_customer_ids:
        if cid not in valid_ids:
            raise HTTPException(400, f"Customer {cid} is not part of this session")

    share = round(float(session.total_amount) / len(payload.payer_customer_ids), 2)
    payers_out = []
    for link in links:
        if link.customer_id in payload.payer_customer_ids:
            link.is_payer = True
            link.share_amount = share
            payers_out.append({
                "customer_id": link.customer_id,
                "name": link.customer.display_name,
                "share_amount": share,
            })
        else:
            link.is_payer = False
            link.share_amount = None

    db.commit()
    return SplitBillingResponse(
        session_id=session.id,
        total_amount=float(session.total_amount),
        payers=payers_out,
    )


@router.post("/{session_id}/done", response_model=BillingRecordResponse)
def finalize_session(session_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.4 - Clicking 'Done' moves the record to the Billing Section,
    creating a log with Serial Number, Player Name(s), Time Played,
    Food & Drink total, Total Amount to be Paid.
    """
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.status != "stopped":
        raise HTTPException(400, "Stop the game before finalizing")

    session.status = "billed"
    session.finalized_at = datetime.utcnow()
    session.asset.status = AssetStatus.IDLE  # frees up the table for a new game

    db.commit()
    db.refresh(session)
    return _to_billing_record(session)


def _to_billing_record(session: GameSession) -> BillingRecordResponse:
    names = [link.customer.display_name for link in session.players]
    minutes = 0.0
    if session.start_time and session.stop_time:
        minutes = round((session.stop_time - session.start_time).total_seconds() / 60.0, 2)
    return BillingRecordResponse(
        session_id=session.id,
        serial_number=session.serial_number,
        player_names=names,
        time_played_minutes=minutes,
        food_amount=float(session.food_amount),
        total_amount=float(session.total_amount or 0),
        payment_status=session.payment_status,
        paid_amount=float(session.paid_amount),
        pending_amount=float(session.pending_amount),
        start_time=session.start_time,
        stop_time=session.stop_time,
        asset_label=session.display_label,
        is_manual_entry=session.is_manual_entry,
        was_edited=session.was_edited,
    )


@router.get("/records", response_model=list[BillingRecordResponse])
def list_billing_records(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.4 - the Billing Section list, every record with Paid/Unpaid buttons."""
    sessions = (
        db.query(GameSession)
        .filter(GameSession.status == "billed")
        .order_by(GameSession.finalized_at.desc())
        .all()
    )
    return [_to_billing_record(s) for s in sessions]


@router.post("/{session_id}/paid", response_model=BillingRecordResponse)
def mark_paid(session_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.4 - Paid: customer pays full amount, record saved as completed."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    session.payment_status = "paid"
    session.paid_amount = session.total_amount
    session.pending_amount = 0
    db.commit()
    db.refresh(session)
    return _to_billing_record(session)


@router.post("/{session_id}/unpaid", response_model=BillingRecordResponse)
def mark_unpaid(session_id: int, payload: UnpaidRequest, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.4 - Unpaid: box asks for Paid Amount and Pending Amount."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")
    if round(payload.paid_amount + payload.pending_amount, 2) != round(float(session.total_amount), 2):
        raise HTTPException(400, "Paid Amount + Pending Amount must equal the Total Amount")
    session.payment_status = "unpaid"
    session.paid_amount = payload.paid_amount
    session.pending_amount = payload.pending_amount
    db.commit()
    db.refresh(session)
    return _to_billing_record(session)


@router.get("/{session_id}/detail", response_model=SessionDetailResponse)
def session_detail(session_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.4 / B.7 - 'See Detail' / 'See Details' button: exact start/end times
    and exact food items ordered, for customer clarification at checkout.
    """
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Session not found")

    minutes = 0.0
    if session.start_time and session.stop_time:
        minutes = round((session.stop_time - session.start_time).total_seconds() / 60.0, 2)

    food_lines = []
    for order in session.food_orders:
        for line in order.lines:
            food_lines.append({
                "name": line.food_item.name,
                "quantity": line.quantity,
                "unit_price": float(line.unit_price),
                "line_total": line.line_total,
            })

    return SessionDetailResponse(
        session_id=session.id,
        serial_number=session.serial_number,
        asset_label=session.display_label,
        player_names=[link.customer.display_name for link in session.players],
        start_time=session.start_time,
        stop_time=session.stop_time,
        minutes_played=minutes,
        time_amount=float(session.time_amount or 0),
        food_amount=float(session.food_amount),
        total_amount=float(session.total_amount or 0),
        food_lines=food_lines,
        payment_status=session.payment_status,
        paid_amount=float(session.paid_amount),
        pending_amount=float(session.pending_amount),
    )


def _get_or_create_customer(db: Session, name: str) -> Customer:
    """Same dedupe logic used when starting a game - shared so manual/edited
    entries log into the same Customer table rather than a parallel one."""
    base_username = name.strip().lower().replace(" ", "_")
    username = base_username
    suffix = 1
    existing = db.query(Customer).filter(Customer.username == username).first()
    if existing and existing.display_name.lower() == name.strip().lower():
        return existing
    while db.query(Customer).filter(Customer.username == username).first():
        suffix += 1
        username = f"{base_username}_{suffix}"
    customer = Customer(username=username, display_name=name.strip())
    db.add(customer)
    db.flush()
    return customer


@router.put("/{session_id}/edit", response_model=BillingRecordResponse)
def edit_billing_record(session_id: int, payload: EditBillingRecordRequest, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Free-form edit of an already-billed row. Built for the real-world case
    where the table was stopped under one player's name but a different
    person/group ends up paying - the owner can correct names, times, and
    amounts directly rather than voiding and re-entering the whole row.
    Only fields present in the payload are changed; everything else is left
    untouched. The row is flagged was_edited=True for a lightweight audit trail.
    """
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Billing record not found")
    if session.status != "billed":
        raise HTTPException(400, "Only finalized (billed) records can be edited here")

    if payload.asset_label_override is not None:
        session.asset_label_override = payload.asset_label_override

    if payload.player_names is not None:
        cleaned = [n.strip() for n in payload.player_names if n.strip()]
        if not cleaned:
            raise HTTPException(400, "At least one player name is required")
        # Replace the player roster entirely rather than trying to diff it -
        # simplest correct behaviour for "someone else actually paid".
        for link in list(session.players):
            db.delete(link)
        db.flush()
        for name in cleaned:
            customer = _get_or_create_customer(db, name)
            db.add(SessionPlayer(session_id=session.id, customer_id=customer.id))

    if payload.start_time is not None:
        session.start_time = payload.start_time
    if payload.stop_time is not None:
        session.stop_time = payload.stop_time
    if payload.food_amount is not None:
        session.food_amount = payload.food_amount
    if payload.total_amount is not None:
        session.total_amount = payload.total_amount
    if payload.payment_status is not None:
        if payload.payment_status not in ("paid", "unpaid"):
            raise HTTPException(400, "payment_status must be 'paid' or 'unpaid'")
        session.payment_status = payload.payment_status
    if payload.paid_amount is not None:
        session.paid_amount = payload.paid_amount
    if payload.pending_amount is not None:
        session.pending_amount = payload.pending_amount

    # Recompute time_amount from the (possibly edited) total/food split so
    # the numbers stay internally consistent without forcing the owner to
    # type every derived field by hand.
    session.time_amount = round(float(session.total_amount or 0) - float(session.food_amount or 0), 2)

    session.was_edited = True
    session.last_edited_at = datetime.utcnow()

    db.commit()
    db.refresh(session)
    return _to_billing_record(session)


@router.post("/manual-entry", response_model=BillingRecordResponse)
def create_manual_entry(payload: ManualBillingEntryRequest, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    Add a billing row by hand for play that never went through Start/Stop -
    e.g. a forgotten entry from last night, or a booking settled directly
    in cash. Shows up in the Billing Section exactly like a normal record,
    just flagged is_manual_entry=True so the owner can tell at a glance.
    """
    cleaned_names = [n.strip() for n in payload.player_names if n.strip()]
    if not cleaned_names:
        raise HTTPException(400, "At least one player name is required")
    if payload.stop_time <= payload.start_time:
        raise HTTPException(400, "Stop time must be after start time")
    if payload.payment_status not in ("paid", "unpaid"):
        raise HTTPException(400, "payment_status must be 'paid' or 'unpaid'")

    next_serial = (db.query(func.max(GameSession.serial_number)).scalar() or 0) + 1

    session = GameSession(
        serial_number=next_serial,
        asset_id=None,
        asset_label_override=payload.asset_label.strip() or "Manual Entry",
        start_time=payload.start_time,
        stop_time=payload.stop_time,
        finalized_at=datetime.utcnow(),
        status="billed",
        time_amount=round(payload.total_amount - payload.food_amount, 2),
        food_amount=payload.food_amount,
        total_amount=payload.total_amount,
        payment_status=payload.payment_status,
        paid_amount=payload.paid_amount,
        pending_amount=payload.pending_amount,
        is_manual_entry=True,
    )
    db.add(session)
    db.flush()

    for name in cleaned_names:
        customer = _get_or_create_customer(db, name)
        db.add(SessionPlayer(session_id=session.id, customer_id=customer.id))

    db.commit()
    db.refresh(session)
    return _to_billing_record(session)


@router.delete("/{session_id}")
def delete_billing_record(session_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """Remove a billing row entirely - mainly for cleaning up a mistaken manual entry."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Billing record not found")
    db.delete(session)
    db.commit()
    return {"ok": True}
