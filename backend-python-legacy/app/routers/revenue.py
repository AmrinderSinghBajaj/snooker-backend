from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.deps import get_current_admin
from app.config import settings
from app.models.asset import GameSession
from app.schemas.revenue import (
    TodayRevenueResponse, WeeklyRevenueResponse, MonthlyRevenueResponse,
    DonutSlice, DayDrilldownResponse, WeekDrilldownResponse, MonthDrilldownResponse,
    DateRangeSummaryResponse,
)

router = APIRouter(prefix="/revenue", tags=["revenue"])

# A distinct colour per weekday for the Weekly donut, per FRD B.5
WEEKDAY_COLORS = {
    0: "#4F46E5",  # Mon
    1: "#0EA5E9",  # Tue
    2: "#10B981",  # Wed
    3: "#F59E0B",  # Thu
    4: "#EF4444",  # Fri
    5: "#8B5CF6",  # Sat
    6: "#EC4899",  # Sun
}


def _paid_query(db: Session, start: datetime, end: datetime):
    """Helper: 'Paid' records (finalized & paid) within a datetime window, by finalized_at."""
    return db.query(GameSession).filter(
        GameSession.status == "billed",
        GameSession.payment_status == "paid",
        GameSession.finalized_at >= start,
        GameSession.finalized_at < end,
    )


@router.get("/today", response_model=TodayRevenueResponse)
def today_revenue(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.5 - Today's Earning donut. Orange below the threshold (default Rs 2000),
    turns Green once crossed.
    """
    now = datetime.utcnow()
    start_of_day = datetime(now.year, now.month, now.day)
    end_of_day = start_of_day + timedelta(days=1)

    total = _paid_query(db, start_of_day, end_of_day).with_entities(
        func.coalesce(func.sum(GameSession.total_amount), 0)
    ).scalar()
    total = float(total)

    return TodayRevenueResponse(
        total=total,
        is_above_threshold=total >= settings.DAILY_TARGET_GREEN_THRESHOLD,
        threshold=settings.DAILY_TARGET_GREEN_THRESHOLD,
    )


@router.get("/weekly", response_model=WeeklyRevenueResponse)
def weekly_revenue(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.5 - Weekly Earning: rolling 7-day total (today back to same weekday last week).
    Each day gets a distinct colour slice.
    """
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    window_start = today_start - timedelta(days=6)  # 7-day inclusive window

    slices = []
    grand_total = 0.0
    for i in range(7):
        day_start = window_start + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_total = _paid_query(db, day_start, day_end).with_entities(
            func.coalesce(func.sum(GameSession.total_amount), 0)
        ).scalar()
        day_total = float(day_total)
        grand_total += day_total
        slices.append(DonutSlice(
            label=day_start.strftime("%A"),
            value=day_total,
            color=WEEKDAY_COLORS[day_start.weekday()],
        ))

    return WeeklyRevenueResponse(total=round(grand_total, 2), slices=slices)


@router.get("/monthly", response_model=MonthlyRevenueResponse)
def monthly_revenue(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.5 - Monthly Earning: total for the current calendar month."""
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        month_end = datetime(now.year + 1, 1, 1)
    else:
        month_end = datetime(now.year, now.month + 1, 1)

    total = _paid_query(db, month_start, month_end).with_entities(
        func.coalesce(func.sum(GameSession.total_amount), 0)
    ).scalar()

    return MonthlyRevenueResponse(total=float(total), month_label=now.strftime("%B %Y"))


# ---------- Deep-Dive Details ----------

@router.get("/drilldown/day", response_model=DayDrilldownResponse)
def day_drilldown(target_date: date = Query(...), db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.5 - Click on Day Donut: full list of every transaction for that day."""
    start = datetime(target_date.year, target_date.month, target_date.day)
    end = start + timedelta(days=1)
    sessions = _paid_query(db, start, end).all()

    transactions = []
    for s in sessions:
        minutes = 0.0
        if s.start_time and s.stop_time:
            minutes = round((s.stop_time - s.start_time).total_seconds() / 60.0, 2)
        transactions.append({
            "serial_number": s.serial_number,
            "player_names": [link.customer.display_name for link in s.players],
            "time_played_minutes": minutes,
            "total_amount": float(s.total_amount),
        })

    return DayDrilldownResponse(date=target_date, transactions=transactions)


@router.get("/drilldown/week", response_model=WeekDrilldownResponse)
def week_drilldown(week_end: date = Query(..., description="Last day of the 7-day window, usually today"),
                    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.5 - Click on Week Donut: breakdown for each of the 7 days."""
    end_dt = datetime(week_end.year, week_end.month, week_end.day) + timedelta(days=1)
    start_dt = end_dt - timedelta(days=7)

    daily_totals = []
    for i in range(7):
        day_start = start_dt + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_total = _paid_query(db, day_start, day_end).with_entities(
            func.coalesce(func.sum(GameSession.total_amount), 0)
        ).scalar()
        daily_totals.append(DonutSlice(
            label=day_start.strftime("%a %d %b"),
            value=float(day_total),
            color=WEEKDAY_COLORS[day_start.weekday()],
        ))

    return WeekDrilldownResponse(
        start_date=start_dt.date(),
        end_date=(end_dt - timedelta(days=1)).date(),
        daily_totals=daily_totals,
    )


@router.get("/drilldown/month", response_model=MonthDrilldownResponse)
def month_drilldown(year: int = Query(...), month: int = Query(..., ge=1, le=12),
                     db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.5 - Click on Month Donut: breakdown for each day of that month."""
    month_start = datetime(year, month, 1)
    next_month = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
    num_days = (next_month - month_start).days

    daily_totals = []
    for i in range(num_days):
        day_start = month_start + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_total = _paid_query(db, day_start, day_end).with_entities(
            func.coalesce(func.sum(GameSession.total_amount), 0)
        ).scalar()
        daily_totals.append(DonutSlice(label=str(day_start.day), value=float(day_total)))

    return MonthDrilldownResponse(month_label=month_start.strftime("%B %Y"), daily_totals=daily_totals)


# ---------- Custom Search & Filters ----------

@router.get("/search/date", response_model=DayDrilldownResponse)
def search_specific_date(target_date: date = Query(...), db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """FRD B.5 - Date Search: pick a specific date to see exactly what happened."""
    return day_drilldown(target_date, db, current_admin)  # reuse the same logic


@router.get("/search/range", response_model=DateRangeSummaryResponse)
def search_date_range(start_date: date = Query(...), end_date: date = Query(...),
                       db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    """
    FRD B.5 - Date Range: Start Date / End Date to see total revenue + details.
    Also surfaces Total Earnings (paid) and Due Bills (unpaid) per the
    'financial health tracker' requirement.
    """
    start_dt = datetime(start_date.year, start_date.month, start_date.day)
    end_dt = datetime(end_date.year, end_date.month, end_date.day) + timedelta(days=1)

    total_earnings = db.query(GameSession).filter(
        GameSession.status == "billed",
        GameSession.payment_status == "paid",
        GameSession.finalized_at >= start_dt,
        GameSession.finalized_at < end_dt,
    ).with_entities(func.coalesce(func.sum(GameSession.total_amount), 0)).scalar()

    unpaid_sessions = db.query(GameSession).filter(
        GameSession.status == "billed",
        GameSession.payment_status == "unpaid",
        GameSession.finalized_at >= start_dt,
        GameSession.finalized_at < end_dt,
    ).all()

    due_bills = [{
        "session_id": s.id,
        "serial_number": s.serial_number,
        "player_names": [link.customer.display_name for link in s.players],
        "pending_amount": float(s.pending_amount),
    } for s in unpaid_sessions]

    return DateRangeSummaryResponse(
        start_date=start_date,
        end_date=end_date,
        total_earnings=float(total_earnings),
        due_bills=due_bills,
    )
