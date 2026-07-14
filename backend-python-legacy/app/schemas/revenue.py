from datetime import date
from typing import Optional
from pydantic import BaseModel


class DonutSlice(BaseModel):
    label: str       # e.g. day name, or asset category
    value: float
    color: Optional[str] = None


class TodayRevenueResponse(BaseModel):
    total: float
    is_above_threshold: bool   # drives Orange -> Green colour logic
    threshold: float


class WeeklyRevenueResponse(BaseModel):
    total: float
    slices: list[DonutSlice]   # one slice per day, each a different colour


class MonthlyRevenueResponse(BaseModel):
    total: float
    month_label: str


class DayDrilldownResponse(BaseModel):
    date: date
    transactions: list[dict]   # [{serial_number, player_names, time_played, total_amount}]


class WeekDrilldownResponse(BaseModel):
    start_date: date
    end_date: date
    daily_totals: list[DonutSlice]


class MonthDrilldownResponse(BaseModel):
    month_label: str
    daily_totals: list[DonutSlice]


class DateRangeQuery(BaseModel):
    start_date: date
    end_date: date


class DateRangeSummaryResponse(BaseModel):
    start_date: date
    end_date: date
    total_earnings: float
    due_bills: list[dict]   # [{session_id, serial_number, player_names, pending_amount}]
