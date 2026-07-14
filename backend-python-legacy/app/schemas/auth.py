from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    club_name: str
    full_name: str
    role: str


class AdminMeResponse(BaseModel):
    username: str
    full_name: str
    club_name: str
    role: str
