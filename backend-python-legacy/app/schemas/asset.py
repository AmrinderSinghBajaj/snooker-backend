from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.asset import AssetCategory, AssetStatus


class AssetCreate(BaseModel):
    category: AssetCategory
    hourly_rate: float
    image_url: Optional[str] = None


class AssetResponse(BaseModel):
    id: int
    category: AssetCategory
    label: str
    hourly_rate: float
    image_url: Optional[str]
    status: AssetStatus

    class Config:
        from_attributes = True


class StartGameRequest(BaseModel):
    """FRD B.3 - text boxes appear to enter names of players (1-4)."""
    player_names: list[str]   # 1 to 4 names


class ActiveSessionResponse(BaseModel):
    session_id: int
    serial_number: int
    asset_id: int
    asset_label: str
    category: AssetCategory
    start_time: datetime
    hourly_rate: float
    player_names: list[str]
    status: str

    class Config:
        from_attributes = True
