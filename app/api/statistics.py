"""
Statistics API endpoints
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List, Dict, Tuple
from datetime import datetime, date, timedelta
from calendar import monthrange

from app.models.database import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.utils.crypto import decrypt_data
from app.utils.user_context import get_active_user_id

router = APIRouter()


def _parse_date_param(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
        return None


def _apply_date_filters(query, start: Optional[date], end: Optional[date]):
    if start:
        query = query.filter(Expense.purchase_date >= start)
    if end:
        query = query.filter(Expense.purchase_date <= end)
    return query


@router.get("/summary")
async def get_summary_statistics(
    db: Session = Depends(get_db),
    period: str = Query("month", description="Period: month, week, day"),
    target_date: Optional[str] = Query(None, description="Target date YYYY-MM-DD"),
    date_from: Optional[str] = Query(None, description="Custom range start YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Custom range end YYYY-MM-DD")
):
    """
    Get summary statistics for different time periods

    Returns:
    - Total expenses for current month
    - Total expenses for current week
    - Total expenses for today
    - Comparison with previous month
    """

    # TODO: Get from authenticated user
    user_id = get_active_user_id(db)

    today = date.today() if not target_date else datetime.strptime(target_date, "%Y-%m-%d").date()
    range_start = _parse_date_param(date_from)
    range_end = _parse_date_param(date_to)
    if range_start and not range_end:
        range_end = range_start
    if range_end and not range_start:
        range_start = range_end
    if range_start and range_end and range_start > range_end:
        range_start, range_end = range_end, range_start

    # Current month
    if range_start and range_end:
        month_start = range_start
        month_end = range_end
    else:
        month_start = date(today.year, today.month, 1)
        _, last_day = monthrange(today.year, today.month)
        month_end = date(today.year, today.month, last_day)

    current_month_result = db.query(
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count'),
        func.avg(Expense.amount).label('average')
    ).filter(
        Expense.owner_user_id == user_id,
        Expense.purchase_date >= month_start,
        Expense.purchase_date <= month_end
    ).first()

    # Current week (Monday to Sunday)
    if range_start and range_end:
        week_end = range_end
        week_start = max(range_start, range_end - timedelta(days=6))
    else:
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

    current_week_result = db.query(
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).filter(
        Expense.owner_user_id == user_id,
        Expense.purchase_date >= week_start,
        Expense.purchase_date <= week_end
    ).first()

    # Today
    today_reference = range_end or today

    today_result = db.query(
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).filter(
        Expense.owner_user_id == user_id,
        Expense.purchase_date == today_reference
    ).first()

    # Previous month for comparison
    compare_reference = today_reference
    if compare_reference.month == 1:
        prev_month = 12
        prev_year = compare_reference.year - 1
    else:
        prev_month = compare_reference.month - 1
        prev_year = compare_reference.year

    prev_month_start = date(prev_year, prev_month, 1)
    _, prev_last_day = monthrange(prev_year, prev_month)
    prev_month_end = date(prev_year, prev_month, prev_last_day)

    previous_month_result = db.query(
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.owner_user_id == user_id,
        Expense.purchase_date >= prev_month_start,
        Expense.purchase_date <= prev_month_end
    ).first()

    # Calculate change percentage
    current_total = float(current_month_result.total or 0)
    previous_total = float(previous_month_result.total or 0)

    if previous_total > 0:
        change_percentage = ((current_total - previous_total) / previous_total) * 100
        trend = "up" if change_percentage > 0 else "down" if change_percentage < 0 else "stable"
    else:
        change_percentage = 0
        trend = "stable"

    return {
        "current_month": {
            "total": float(current_month_result.total or 0),
            "count": int(current_month_result.count or 0),
            "average": float(current_month_result.average or 0)
        },
        "current_week": {
            "total": float(current_week_result.total or 0),
            "count": int(current_week_result.count or 0)
        },
        "today": {
            "total": float(today_result.total or 0),
            "count": int(today_result.count or 0)
        },
        "comparison_previous_month": {
            "previous_total": previous_total,
            "change_amount": current_total - previous_total,
            "change_percentage": round(change_percentage, 2),
            "trend": trend
        }
    }


@router.get("/by_category")
async def get_statistics_by_category(
    db: Session = Depends(get_db),
    period: str = Query("month", description="Period: month, year, all"),
    target_date: Optional[str] = Query(None, description="Target date YYYY-MM-DD (for month)"),
    date_from: Optional[str] = Query(None, description="Custom range start YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Custom range end YYYY-MM-DD")
):
    """
    Get expense statistics grouped by category

    Returns total amount and count per category
    """

    # TODO: Get from authenticated user
    user_id = get_active_user_id(db)

    today = date.today() if not target_date else datetime.strptime(target_date, "%Y-%m-%d").date()

    expenses_query = db.query(Expense).filter(Expense.owner_user_id == user_id)
    range_start = _parse_date_param(date_from)
    range_end = _parse_date_param(date_to)
    if range_start and not range_end:
        range_end = range_start
    if range_end and not range_start:
        range_start = range_end
    if range_start and range_end and range_start > range_end:
        range_start, range_end = range_end, range_start

    if range_start and range_end:
        expenses_query = expenses_query.filter(
            Expense.purchase_date >= range_start,
            Expense.purchase_date <= range_end
        )
        period_label = f"{range_start.isoformat()} → {range_end.isoformat()}"
    elif period == "month":
        month_start = date(today.year, today.month, 1)
        _, last_day = monthrange(today.year, today.month)
        month_end = date(today.year, today.month, last_day)
        expenses_query = expenses_query.filter(
            Expense.purchase_date >= month_start,
            Expense.purchase_date <= month_end
        )
        period_label = f"{today.year}-{today.month:02d}"
    elif period == "year":
        year_start = date(today.year, 1, 1)
        year_end = date(today.year, 12, 31)
        expenses_query = expenses_query.filter(
            Expense.purchase_date >= year_start,
            Expense.purchase_date <= year_end
        )
        period_label = str(today.year)
    else:
        period_label = "all"

    expenses = expenses_query.all()
    categories_meta = _build_category_metadata(db, user_id)
    aggregates = _aggregate_categories(expenses, categories_meta)

    grand_total = sum(item["total"] for item in aggregates.values())
    category_list = []
    for agg in sorted(aggregates.values(), key=lambda x: x["total"], reverse=True):
        percentage = (agg["total"] / grand_total * 100) if grand_total > 0 else 0
        category_list.append({
            "category_id": agg["category_id"],
            "category_name": agg["category_name"],
            "color": agg["color"],
            "icon": agg["icon"],
            "total": agg["total"],
            "count": agg["count"],
            "percentage": round(percentage, 2)
        })

    return {
        "period": period_label,
        "grand_total": grand_total,
        "categories": category_list
    }


@router.get("/by_vendor")
async def get_statistics_by_vendor(
    db: Session = Depends(get_db),
    period: str = Query("month", description="Period: month, year, all"),
    limit: int = Query(10, description="Top N vendors"),
    target_date: Optional[str] = Query(None, description="Target date YYYY-MM-DD"),
    date_from: Optional[str] = Query(None, description="Custom range start YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Custom range end YYYY-MM-DD")
):
    """
    Get top vendors by total expense amount

    Note: This decrypts vendor names, so it may be slower
    """

    # TODO: Get from authenticated user
    user_id = get_active_user_id(db)

    today = date.today() if not target_date else datetime.strptime(target_date, "%Y-%m-%d").date()

    # Build query
    query = db.query(
        Expense.vendor,
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).filter(
        Expense.owner_user_id == user_id,
        Expense.vendor.isnot(None)
    )

    range_start = _parse_date_param(date_from)
    range_end = _parse_date_param(date_to)
    if range_start and not range_end:
        range_end = range_start
    if range_end and not range_start:
        range_start = range_end
    if range_start and range_end and range_start > range_end:
        range_start, range_end = range_end, range_start

    if range_start and range_end:
        query = query.filter(
            Expense.purchase_date >= range_start,
            Expense.purchase_date <= range_end
        )
        period_label = f"{range_start.isoformat()} → {range_end.isoformat()}"
    elif period == "month":
        month_start = date(today.year, today.month, 1)
        _, last_day = monthrange(today.year, today.month)
        month_end = date(today.year, today.month, last_day)
        query = query.filter(
            Expense.purchase_date >= month_start,
            Expense.purchase_date <= month_end
        )
        period_label = f"{today.year}-{today.month:02d}"
    elif period == "year":
        year_start = date(today.year, 1, 1)
        year_end = date(today.year, 12, 31)
        query = query.filter(
            Expense.purchase_date >= year_start,
            Expense.purchase_date <= year_end
        )
        period_label = str(today.year)
    else:
        period_label = "all"

    results = query.group_by(Expense.vendor).all()

    # Decrypt vendor names and aggregate
    vendor_map = {}
    for r in results:
        try:
            decrypted_vendor = decrypt_data(r.vendor)
            total = float(r.total or 0)
            count = int(r.count or 0)

            if decrypted_vendor in vendor_map:
                vendor_map[decrypted_vendor]['total'] += total
                vendor_map[decrypted_vendor]['count'] += count
            else:
                vendor_map[decrypted_vendor] = {
                    'vendor': decrypted_vendor,
                    'total': total,
                    'count': count
                }
        except:
            pass

    # Sort by total and limit
    sorted_vendors = sorted(vendor_map.values(), key=lambda x: x['total'], reverse=True)[:limit]

    # Calculate percentages
    grand_total = sum(v['total'] for v in sorted_vendors)

    top_vendors = []
    for v in sorted_vendors:
        percentage = (v['total'] / grand_total * 100) if grand_total > 0 else 0
        top_vendors.append({
            "vendor": v['vendor'],
            "total": v['total'],
            "count": v['count'],
            "percentage": round(percentage, 2)
        })

    return {
        "period": period_label,
        "grand_total": grand_total,
        "top_vendors": top_vendors
    }


@router.get("/trend")
async def get_trend_statistics(
    db: Session = Depends(get_db),
    trend_type: str = Query("daily", description="Type: daily, weekly, monthly"),
    range_value: int = Query(30, description="Number of periods (days/weeks/months)"),
    target_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    date_from: Optional[str] = Query(None, description="Custom range start YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Custom range end YYYY-MM-DD")
):
    """
    Get expense trend over time

    Returns time series data for charts
    """

    # TODO: Get from authenticated user
    user_id = get_active_user_id(db)

    end_date = date.today() if not target_date else datetime.strptime(target_date, "%Y-%m-%d").date()
    range_start = _parse_date_param(date_from)
    range_end = _parse_date_param(date_to)
    if range_start and not range_end:
        range_end = range_start
    if range_end and not range_start:
        range_start = range_end
    if range_start and range_end and range_start > range_end:
        range_start, range_end = range_end, range_start

    if range_start and range_end:
        end_date = range_end
        total_days = (range_end - range_start).days + 1
        if total_days > 180:
            total_days = 180
            range_start = range_end - timedelta(days=total_days - 1)
        trend_type = "daily"
        range_value = total_days

    data = []

    if trend_type == "daily":
        for i in range(range_value - 1, -1, -1):
            current_date = end_date - timedelta(days=i)

            result = db.query(
                func.sum(Expense.amount).label('total'),
                func.count(Expense.id).label('count')
            ).filter(
                Expense.owner_user_id == user_id,
                Expense.purchase_date == current_date
            ).first()

            data.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "total": float(result.total or 0),
                "count": int(result.count or 0)
            })

    elif trend_type == "weekly":
        for i in range(range_value - 1, -1, -1):
            week_end = end_date - timedelta(weeks=i)
            week_start = week_end - timedelta(days=6)

            result = db.query(
                func.sum(Expense.amount).label('total'),
                func.count(Expense.id).label('count')
            ).filter(
                Expense.owner_user_id == user_id,
                Expense.purchase_date >= week_start,
                Expense.purchase_date <= week_end
            ).first()

            data.append({
                "week_start": week_start.strftime("%Y-%m-%d"),
                "week_end": week_end.strftime("%Y-%m-%d"),
                "total": float(result.total or 0),
                "count": int(result.count or 0)
            })

    elif trend_type == "monthly":
        for i in range(range_value - 1, -1, -1):
            target_month = end_date.month - i
            target_year = end_date.year

            while target_month <= 0:
                target_month += 12
                target_year -= 1

            while target_month > 12:
                target_month -= 12
                target_year += 1

            month_start = date(target_year, target_month, 1)
            _, last_day = monthrange(target_year, target_month)
            month_end = date(target_year, target_month, last_day)

            result = db.query(
                func.sum(Expense.amount).label('total'),
                func.count(Expense.id).label('count')
            ).filter(
                Expense.owner_user_id == user_id,
                Expense.purchase_date >= month_start,
                Expense.purchase_date <= month_end
            ).first()

            data.append({
                "month": f"{target_year}-{target_month:02d}",
                "total": float(result.total or 0),
                "count": int(result.count or 0)
            })

    return {
        "type": trend_type,
        "range": range_value,
        "data": data
    }


@router.get("/comparison")
async def get_comparison_statistics(
    db: Session = Depends(get_db),
    current_period: str = Query(..., description="Current period YYYY-MM"),
    previous_period: str = Query(..., description="Previous period YYYY-MM")
):
    """
    Compare two time periods

    Returns totals and percentage change
    """

    # TODO: Get from authenticated user
    user_id = get_active_user_id(db)

    # Parse periods
    try:
        current_year, current_month = map(int, current_period.split('-'))
        previous_year, previous_month = map(int, previous_period.split('-'))
    except:
        raise HTTPException(status_code=400, detail="Invalid period format. Use YYYY-MM")

    # Current period
    current_start = date(current_year, current_month, 1)
    _, current_last_day = monthrange(current_year, current_month)
    current_end = date(current_year, current_month, current_last_day)

    current_result = db.query(
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).filter(
        Expense.owner_user_id == user_id,
        Expense.purchase_date >= current_start,
        Expense.purchase_date <= current_end
    ).first()

    # Previous period
    previous_start = date(previous_year, previous_month, 1)
    _, previous_last_day = monthrange(previous_year, previous_month)
    previous_end = date(previous_year, previous_month, previous_last_day)

    previous_result = db.query(
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).filter(
        Expense.owner_user_id == user_id,
        Expense.purchase_date >= previous_start,
        Expense.purchase_date <= previous_end
    ).first()

    current_total = float(current_result.total or 0)
    previous_total = float(previous_result.total or 0)

    change_amount = current_total - previous_total

    if previous_total > 0:
        change_percentage = (change_amount / previous_total) * 100
        trend = "up" if change_percentage > 0 else "down" if change_percentage < 0 else "stable"
    else:
        change_percentage = 0
        trend = "stable"

    return {
        "current": {
            "period": current_period,
            "total": current_total,
            "count": int(current_result.count or 0)
        },
        "previous": {
            "period": previous_period,
            "total": previous_total,
            "count": int(previous_result.count or 0)
        },
        "change": {
            "amount": change_amount,
            "percentage": round(change_percentage, 2),
            "trend": trend
        }
    }


def _build_category_metadata(db: Session, user_id: str) -> Dict[str, Dict[str, Category]]:
    categories = db.query(Category).filter(Category.user_id == user_id).all()
    by_id = {str(cat.id): cat for cat in categories}
    by_name = {cat.name.lower(): cat for cat in categories if cat.name}
    return {"by_id": by_id, "by_name": by_name}


def _aggregate_categories(expenses: List[Expense], categories_meta: Dict[str, Dict[str, Category]]):
    aggregates: Dict[str, Dict[str, float | int | str]] = {}

    for expense in expenses:
        amount = float(expense.amount or 0)
        if amount == 0:
            continue
        key, name, color, icon = _resolve_category(expense, categories_meta)
        bucket = aggregates.setdefault(
            key,
            {
                "category_id": key,
                "category_name": name,
                "color": color,
                "icon": icon,
                "total": 0.0,
                "count": 0,
            },
        )
        bucket["total"] += amount
        bucket["count"] += 1

    if not aggregates:
        aggregates["uncategorized"] = {
            "category_id": "uncategorized",
            "category_name": "Fără categorie",
            "color": "#94a3b8",
            "icon": "tag",
            "total": 0.0,
            "count": 0,
        }

    return aggregates


def _resolve_category(expense: Expense, categories_meta: Dict[str, Dict[str, Category]]) -> Tuple[str, str, str, str]:
    by_id = categories_meta["by_id"]
    by_name = categories_meta["by_name"]

    category_name_from_payload = _category_from_json(expense)
    if category_name_from_payload:
        mapped = by_name.get(category_name_from_payload.lower())
        if mapped:
            return (
                str(mapped.id),
                mapped.name,
                mapped.color or _color_from_label(mapped.name),
                mapped.icon or "tag",
            )
        key = f"name:{category_name_from_payload.lower()}"
        return (
            key,
            category_name_from_payload,
            _color_from_label(category_name_from_payload),
            "tag",
        )

    if expense.category_id:
        category = by_id.get(str(expense.category_id))
        if category:
            return (
                str(category.id),
                category.name,
                category.color or _color_from_label(category.name),
                category.icon or "tag",
            )
        return (
            str(expense.category_id),
            "Categorie necunoscută",
            "#94a3b8",
            "tag",
        )

    return ("uncategorized", "Fără categorie", "#94a3b8", "tag")


def _category_from_json(expense: Expense) -> Optional[str]:
    if not expense.json_data:
        return None
    try:
        data = decrypt_data(expense.json_data)
        if isinstance(data, str):
            data = json.loads(data)
        category_name = data.get("category")
        if isinstance(category_name, str):
            category_name = category_name.strip()
            return category_name or None
    except Exception:
        return None
    return None


_COLOR_PALETTE = [
    "#34d399",
    "#60a5fa",
    "#f472b6",
    "#facc15",
    "#c084fc",
    "#fb7185",
    "#f97316",
    "#2dd4bf",
]


def _color_from_label(label: str) -> str:
    if not label:
        return "#94a3b8"
    idx = sum(ord(c) for c in label.lower()) % len(_COLOR_PALETTE)
    return _COLOR_PALETTE[idx]
