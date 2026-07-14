from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.routers import auth, assets, billing, food, revenue, customers, branding

# Create tables on startup if they don't exist.
# For production schema changes, prefer Alembic migrations (see alembic/ folder).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="The Billiards Arena - Admin Panel API",
    description="Backend for table/PS billing, food & drink, and revenue analytics.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(assets.router)
app.include_router(billing.router)
app.include_router(food.router)
app.include_router(revenue.router)
app.include_router(customers.router)
app.include_router(branding.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "billiards-arena-api"}
