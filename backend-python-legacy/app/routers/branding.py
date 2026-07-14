import os
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app import club_config

router = APIRouter(prefix="/branding", tags=["branding"])


class BrandingResponse(BaseModel):
    club_name: str
    owner_full_name: str
    owner_role_label: str
    logo_url: str
    has_logo: bool


@router.get("", response_model=BrandingResponse)
def get_branding():
    """
    Public (no auth) so the Login screen can show the right club name and
    logo before anyone signs in. Single source of truth: app/club_config.py.
    """
    has_logo = os.path.isfile(club_config.LOGO_PATH)
    return BrandingResponse(
        club_name=club_config.CLUB_NAME,
        owner_full_name=club_config.OWNER_FULL_NAME,
        owner_role_label=club_config.OWNER_ROLE_LABEL,
        logo_url=club_config.LOGO_URL_PATH,
        has_logo=has_logo,
    )


@router.get("/logo")
def get_logo():
    """Serves the actual logo file referenced by branding.logo_url."""
    if os.path.isfile(club_config.LOGO_PATH):
        return FileResponse(club_config.LOGO_PATH, media_type="image/png")
    # No logo uploaded yet - 404 lets the frontend fall back to a text mark.
    from fastapi import HTTPException
    raise HTTPException(404, "No logo configured")
