from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.deps import get_current_admin
from app.models.asset import Asset, AssetCategory, AssetStatus, GameSession
from app.models.customer import Customer, SessionPlayer
from app.schemas.asset import AssetCreate, AssetResponse, StartGameRequest, ActiveSessionResponse

router = APIRouter(prefix="/assets", tags=["assets"])


def _next_label(db: Session, category: AssetCategory) -> str:
    """
    FRD B.2 - if 3 snooker tables are added, label them 'Table 1', 'Table 2', 'Table 3'.
    PlayStation/Chess/Carrom get their own category name as the label prefix.
    """
    count = db.query(Asset).filter(Asset.category == category).count()
    prefix = "Table" if category in (AssetCategory.SNOOKER, AssetCategory.POOL, AssetCategory.HEYBALL) else category.value
    return f"{prefix} {count + 1}"


@router.get("", response_model=list[AssetResponse])
def list_assets(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """Visual Display grid for the Table & PS Setup screen."""
    return db.query(Asset).filter(Asset.is_archived == False).order_by(Asset.category, Asset.id).all()  # noqa: E712


@router.post("", response_model=AssetResponse)
def add_asset(payload: AssetCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.2 - 'Add' button: Category Dropdown + Price Field (hourly rate).
    Auto-generates the next label, e.g. 'Table 3'.
    """
    label = _next_label(db, payload.category)
    asset = Asset(
        category=payload.category,
        label=label,
        hourly_rate=payload.hourly_rate,
        image_url=payload.image_url,
        status=AssetStatus.IDLE,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def archive_asset(asset_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    asset.is_archived = True
    db.commit()
    return {"ok": True}


# ---------- Main Dashboard (Operations) ----------

@router.get("/active-sessions", response_model=list[ActiveSessionResponse])
def list_active_sessions(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """Powers the Table Grid: shows every asset currently running a Digital Clock."""
    sessions = (
        db.query(GameSession)
        .filter(GameSession.status == "running")
        .all()
    )
    result = []
    for s in sessions:
        names = [link.customer.display_name for link in s.players]
        result.append(ActiveSessionResponse(
            session_id=s.id,
            serial_number=s.serial_number,
            asset_id=s.asset_id,
            asset_label=s.asset.label,
            category=s.asset.category,
            start_time=s.start_time,
            hourly_rate=float(s.asset.hourly_rate),
            player_names=names,
            status=s.status,
        ))
    return result


def _get_or_create_customer(db: Session, name: str) -> Customer:
    """
    FRD B.3 - Customer Log: names automatically added to Customer Management
    with a unique ID; FRD B.4 footnote says save this as a 'username' (unique).
    We slugify + dedupe so repeat customers reuse the same record.
    """
    base_username = name.strip().lower().replace(" ", "_")
    username = base_username
    suffix = 1
    existing = db.query(Customer).filter(Customer.username == username).first()
    # If an existing customer already has this exact display name, reuse it.
    if existing and existing.display_name.lower() == name.strip().lower():
        return existing
    while db.query(Customer).filter(Customer.username == username).first():
        suffix += 1
        username = f"{base_username}_{suffix}"
    customer = Customer(username=username, display_name=name.strip())
    db.add(customer)
    db.flush()
    return customer


@router.post("/{asset_id}/start", response_model=ActiveSessionResponse)
def start_game(asset_id: int, payload: StartGameRequest, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.3 - Starting a Game: enter 1-4 player names, confirm Start,
    Digital Clock starts on that table's image. Names logged to Customer Management.
    """
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if asset.status == AssetStatus.ACTIVE:
        raise HTTPException(400, "This table/device already has an active game")
    if not (1 <= len(payload.player_names) <= 4):
        raise HTTPException(400, "Enter between 1 and 4 player names")

    next_serial = (db.query(func.max(GameSession.serial_number)).scalar() or 0) + 1

    session = GameSession(
        serial_number=next_serial,
        asset_id=asset.id,
        start_time=datetime.utcnow(),
        status="running",
    )
    db.add(session)
    db.flush()

    for name in payload.player_names:
        customer = _get_or_create_customer(db, name)
        db.add(SessionPlayer(session_id=session.id, customer_id=customer.id))

    asset.status = AssetStatus.ACTIVE
    db.commit()
    db.refresh(session)

    names = [link.customer.display_name for link in session.players]
    return ActiveSessionResponse(
        session_id=session.id,
        serial_number=session.serial_number,
        asset_id=asset.id,
        asset_label=asset.label,
        category=asset.category,
        start_time=session.start_time,
        hourly_rate=float(asset.hourly_rate),
        player_names=names,
        status=session.status,
    )
