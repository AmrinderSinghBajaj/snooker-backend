"""
Application settings, loaded from environment variables.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))  # 12 hrs

    # CORS - the Firebase Hosting URL(s) of the frontend
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,https://your-project.web.app,https://your-project.firebaseapp.com"
    ).split(",")

    # S3 bucket for table images / menu item images (optional, falls back to local /static)
    S3_BUCKET: str = os.getenv("S3_BUCKET", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")

    # Revenue donut "Today" turns green once this threshold (in INR) is crossed
    DAILY_TARGET_GREEN_THRESHOLD: int = int(os.getenv("DAILY_TARGET_GREEN_THRESHOLD", "2000"))


settings = Settings()
