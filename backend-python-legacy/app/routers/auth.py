from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.admin_user import AdminUser
from app.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, TokenResponse, AdminMeResponse
from app.deps import get_current_admin

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    FRD B.1 - Login Method: Username and Password.
    Returns a JWT plus the club name / owner name shown on the dashboard header.
    """
    user = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": user.username})
    return TokenResponse(
        access_token=token,
        club_name=user.club_name,
        full_name=user.full_name,
        role=user.role,
    )


@router.get("/me", response_model=AdminMeResponse)
def get_me(current_admin: AdminUser = Depends(get_current_admin)):
    """Used to repopulate Top Left (Club Name) / Top Right (User's Name, 'Club Owner') on refresh."""
    return AdminMeResponse(
        username=current_admin.username,
        full_name=current_admin.full_name,
        club_name=current_admin.club_name,
        role=current_admin.role,
    )
