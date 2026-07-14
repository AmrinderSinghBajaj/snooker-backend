import enum
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AssetCategory(str, enum.Enum):
    """FRD Part B.2 - Category Dropdown options."""
    SNOOKER = "Snooker"
    POOL = "Pool"
    HEYBALL = "Heyball"
    PLAYSTATION = "PlayStation"
    CHESS = "Chess"
    CARROM = "Carrom"


class AssetStatus(str, enum.Enum):
    IDLE = "idle"          # not currently in a game
    ACTIVE = "active"      # game running, clock counting
    STOPPED = "stopped"    # stopped, awaiting billing/Done


class Asset(Base):
    """
    A single billing unit set up by the owner in the Table & PS Section.
    FRD Part B.2 - each added unit becomes "Table 1", "Table 2", etc.,
    grouped by category.
    """
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(Enum(AssetCategory), nullable=False)
    label = Column(String(50), nullable=False)        # e.g. "Table 1", "PlayStation 2"
    hourly_rate = Column(Numeric(10, 2), nullable=False)   # e.g. 360.00
    image_url = Column(String(500), nullable=True)
    status = Column(Enum(AssetStatus), nullable=False, default=AssetStatus.IDLE)
    is_archived = Column(Boolean, default=False)  # soft-delete instead of hard delete
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("GameSession", back_populates="asset")

    @property
    def per_minute_rate(self):
        return float(self.hourly_rate) / 60.0


class GameSession(Base):
    """
    One play session on an Asset, from Start to Done.
    FRD Part B.3 & B.4 - Starting a Game / Billing & Payments.
    """
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(Integer, nullable=False, unique=True, index=True)
    # Nullable: a manually-entered record (see is_manual_entry) may not map to
    # a real table/PS, e.g. a forgotten cash entry from a previous shift.
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    # Free-text fallback label, used when asset_id is None (manual entry with
    # no real asset link) so the row still shows something meaningful.
    asset_label_override = Column(String(80), nullable=True)

    start_time = Column(DateTime(timezone=True), nullable=True)
    stop_time = Column(DateTime(timezone=True), nullable=True)   # when Red "Stop" clicked (pauses timer)
    finalized_at = Column(DateTime(timezone=True), nullable=True)  # when "Done" clicked -> moves to Billing

    status = Column(String(20), nullable=False, default="running")
    # running -> stopped -> billed (Done clicked) -> paid / unpaid

    time_amount = Column(Numeric(10, 2), nullable=True)     # cost from minutes played
    food_amount = Column(Numeric(10, 2), nullable=False, default=0)
    total_amount = Column(Numeric(10, 2), nullable=True)    # time_amount + food_amount

    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    pending_amount = Column(Numeric(10, 2), nullable=False, default=0)
    payment_status = Column(String(20), nullable=True)      # "paid" | "unpaid" | None until Done

    # Audit trail for the billing-row editing feature: the owner can freely
    # correct a record (e.g. a different player ended up paying), and we
    # keep a lightweight trace of that rather than silently overwriting.
    is_manual_entry = Column(Boolean, nullable=False, default=False)
    was_edited = Column(Boolean, nullable=False, default=False)
    last_edited_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asset = relationship("Asset", back_populates="sessions")
    players = relationship("SessionPlayer", back_populates="session", cascade="all, delete-orphan")
    food_orders = relationship("FoodOrder", back_populates="session", cascade="all, delete-orphan")

    @property
    def display_label(self) -> str:
        """
        Safe label for UI/exports regardless of whether this session is tied
        to a real Asset (normal flow) or stands alone (manual entry).
        """
        if self.asset:
            return self.asset.label
        return self.asset_label_override or "Manual Entry"
