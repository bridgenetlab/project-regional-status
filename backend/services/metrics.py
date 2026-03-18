"""KPI calculations and metrics aggregation."""

from datetime import datetime
from typing import Optional
from models.schemas import RegionSummary, GlobalSummary


def calculate_days_delta(target_end_date: Optional[str], actual_end_date: Optional[str]) -> Optional[int]:
    """
    Calculate days ahead/behind schedule.
    Returns:
      positive int  = days BEHIND schedule (actual > target)
      negative int  = days AHEAD of schedule (actual < target)
      None          = not applicable (one or both dates are None)
    """
    if not target_end_date or not actual_end_date:
        return None

    try:
        target = datetime.strptime(target_end_date, '%Y-%m-%d')
        actual = datetime.strptime(actual_end_date, '%Y-%m-%d')
        delta = (actual - target).days
        return delta
    except ValueError:
        return None


def get_schedule_status(days_delta: Optional[int]) -> str:
    """Get schedule status label from days_delta."""
    if days_delta is None:
        return 'not_applicable'
    elif days_delta > 0:
        return 'behind'
    elif days_delta < 0:
        return 'ahead'
    else:
        return 'on_time'


def enrich_records_with_metrics(records: list[dict]) -> list[dict]:
    """
    Add computed days_delta and schedule_status to each record.
    Modifies records in-place.
    """
    for record in records:
        record['days_delta'] = calculate_days_delta(
            record.get('target_end_date'),
            record.get('actual_end_date')
        )
        record['schedule_status'] = get_schedule_status(record['days_delta'])

    return records


def compute_regional_summary(records: list[dict]) -> dict[str, RegionSummary]:
    """
    Compute KPI summary by region.
    Returns dict of {region_name: RegionSummary}.
    """
    region_stats = {}

    for record in records:
        region = record.get('region') or 'Unknown'
        if region not in region_stats:
            region_stats[region] = {
                'total': 0,
                'completed': 0,
                'in_progress': 0,
                'not_started': 0,
                'days_deltas': [],  # For averaging
                'behind': 0,
                'ahead': 0,
                'on_time': 0,
            }

        stats = region_stats[region]
        stats['total'] += 1

        # Count by status
        status = (record.get('status') or '').strip().lower()
        if status == 'completed':
            stats['completed'] += 1
        elif status == 'in progress':
            stats['in_progress'] += 1
        else:
            stats['not_started'] += 1

        # Track days_delta
        if record['days_delta'] is not None:
            stats['days_deltas'].append(record['days_delta'])
            if record['days_delta'] > 0:
                stats['behind'] += 1
            elif record['days_delta'] < 0:
                stats['ahead'] += 1
            else:
                stats['on_time'] += 1

    # Convert to RegionSummary objects
    summaries = {}
    for region_name, stats in region_stats.items():
        avg_delta = None
        if stats['days_deltas']:
            avg_delta = sum(stats['days_deltas']) / len(stats['days_deltas'])

        completion_rate = (stats['completed'] / stats['total'] * 100) if stats['total'] > 0 else 0

        summaries[region_name] = RegionSummary(
            region=region_name,
            total=stats['total'],
            completed=stats['completed'],
            in_progress=stats['in_progress'],
            not_started=stats['not_started'],
            completion_rate=round(completion_rate, 1),
            avg_days_delta=round(avg_delta, 1) if avg_delta is not None else None,
            behind_schedule=stats['behind'],
            ahead_of_schedule=stats['ahead'],
            on_schedule=stats['on_time'],
        )

    return summaries


def compute_global_summary(records: list[dict]) -> GlobalSummary:
    """
    Compute global KPI summary across all branches.
    """
    total = len(records)
    if total == 0:
        return GlobalSummary(
            total_branches=0,
            completed=0,
            in_progress=0,
            not_started=0,
            completion_rate=0.0,
            avg_days_delta=None,
            behind_schedule=0,
            ahead_of_schedule=0,
            on_schedule=0,
            site_readiness_under_renovation=0,
            pending_uat=0,
            delivery_status_count={},
        )

    completed = sum(1 for r in records if (r.get('status') or '').strip().lower() == 'completed')
    in_progress = sum(1 for r in records if (r.get('status') or '').strip().lower() == 'in progress')
    not_started = total - completed - in_progress

    days_deltas = [r['days_delta'] for r in records if r['days_delta'] is not None]
    avg_delta = (sum(days_deltas) / len(days_deltas)) if days_deltas else None

    behind = sum(1 for d in days_deltas if d > 0)
    ahead = sum(1 for d in days_deltas if d < 0)
    on_time = sum(1 for d in days_deltas if d == 0)

    completion_rate = (completed / total * 100) if total > 0 else 0.0

    # New metrics - more flexible matching
    site_readiness_under_renovation = sum(
        1 for r in records
        if 'renovation' in (r.get('site_readiness') or '').lower()
    )

    pending_uat = sum(
        1 for r in records
        if (r.get('uat_document') or '').strip().lower() == 'not started'
    )

    # Count delivery statuses
    delivery_status_count = {}
    for r in records:
        status = (r.get('delivery_status') or '').strip()
        if status:
            delivery_status_count[status] = delivery_status_count.get(status, 0) + 1

    return GlobalSummary(
        total_branches=total,
        completed=completed,
        in_progress=in_progress,
        not_started=not_started,
        completion_rate=round(completion_rate, 1),
        avg_days_delta=round(avg_delta, 1) if avg_delta is not None else None,
        behind_schedule=behind,
        ahead_of_schedule=ahead,
        on_schedule=on_time,
        site_readiness_under_renovation=site_readiness_under_renovation,
        pending_uat=pending_uat,
        delivery_status_count=delivery_status_count,
    )


def filter_branches(
    records: list[dict],
    region: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    site_readiness: Optional[str] = None,
    uat_document: Optional[str] = None,
) -> list[dict]:
    """Filter branches by region, status, search text, site_readiness, and uat_document."""
    filtered = records

    if region:
        filtered = [r for r in filtered if (r.get('region') or '').lower() == region.lower()]

    if status:
        filtered = [r for r in filtered if (r.get('status') or '').lower() == status.lower()]

    if search:
        search_lower = search.lower()
        filtered = [
            r for r in filtered
            if search_lower in (r.get('branch_name') or '').lower()
            or search_lower in (r.get('address') or '').lower()
            or search_lower in (r.get('pic') or '').lower()
        ]

    if site_readiness:
        # Substring match for site_readiness (same as overview calculation)
        site_readiness_lower = site_readiness.lower()
        filtered = [r for r in filtered if site_readiness_lower in (r.get('site_readiness') or '').lower()]

    if uat_document:
        # Exact match for uat_document (same as overview calculation)
        uat_document_lower = uat_document.strip().lower()
        filtered = [r for r in filtered if (r.get('uat_document') or '').strip().lower() == uat_document_lower]

    return filtered


def sort_branches(
    records: list[dict],
    sort_by: Optional[str] = None,
    sort_dir: str = 'asc',
) -> list[dict]:
    """Sort branches by field."""
    if not sort_by or sort_by not in records[0] if records else False:
        return records

    reverse = sort_dir.lower() == 'desc'

    # Special handling for numeric/date fields
    if sort_by in ['days_delta', 'cisco_9851', 'cisco_9841', 'no']:
        return sorted(
            records,
            key=lambda r: r.get(sort_by) or (999999 if reverse else -999999),
            reverse=reverse
        )

    return sorted(
        records,
        key=lambda r: (r.get(sort_by) or '').lower(),
        reverse=reverse
    )


def paginate_branches(
    records: list[dict],
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[dict], int]:
    """Paginate branch records. Returns (page_records, total_count)."""
    total = len(records)
    page = max(1, page)
    per_page = max(1, min(per_page, 1000))  # Cap at 1000

    start = (page - 1) * per_page
    end = start + per_page

    return records[start:end], total


def parse_cost(value: Optional[str | int | float]) -> Optional[float]:
    """Parse installation cost value to float. Handles various formats."""
    if value is None or value == '':
        return None

    try:
        # If it's already a number
        if isinstance(value, (int, float)):
            return float(value)

        # If it's a string, try to convert
        if isinstance(value, str):
            # Remove common currency symbols and whitespace
            cleaned = value.replace('$', '').replace(',', '').replace(' ', '').strip()
            return float(cleaned)

        return None
    except (ValueError, AttributeError):
        return None


def compute_costing_summary(records: list[dict]) -> dict:
    """
    Compute installation costing metrics.
    Returns summary including total cost, by region, by vendor.
    """
    total_cost = 0
    by_region = {}  # {region: {total: x, count: y, vendors: {...}}}
    by_vendor = {}  # {vendor: {total: x, count: y, regions: {...}}}

    for record in records:
        cost = parse_cost(record.get('installation_cost'))
        vendor = (record.get('installation_vendor') or 'Unknown').strip()
        region = (record.get('region') or 'Unknown').strip()

        # Only count records with valid costs
        if cost is None or cost <= 0:
            continue

        total_cost += cost

        # By region
        if region not in by_region:
            by_region[region] = {'total': 0, 'count': 0, 'vendors': {}}
        by_region[region]['total'] += cost
        by_region[region]['count'] += 1

        # Track vendor within region
        if vendor not in by_region[region]['vendors']:
            by_region[region]['vendors'][vendor] = 0
        by_region[region]['vendors'][vendor] += cost

        # By vendor
        if vendor not in by_vendor:
            by_vendor[vendor] = {'total': 0, 'count': 0, 'regions': {}}
        by_vendor[vendor]['total'] += cost
        by_vendor[vendor]['count'] += 1

        # Track region within vendor
        if region not in by_vendor[vendor]['regions']:
            by_vendor[vendor]['regions'][region] = 0
        by_vendor[vendor]['regions'][region] += cost

    # Format by region
    regions_list = []
    for region, data in by_region.items():
        regions_list.append({
            'region': region,
            'total_cost': round(data['total'], 2),
            'count': data['count'],
            'avg_cost': round(data['total'] / data['count'], 2) if data['count'] > 0 else 0,
            'vendors': data['vendors']
        })

    # Format by vendor
    vendors_list = []
    for vendor, data in by_vendor.items():
        vendors_list.append({
            'vendor': vendor,
            'total_cost': round(data['total'], 2),
            'count': data['count'],
            'avg_cost': round(data['total'] / data['count'], 2) if data['count'] > 0 else 0,
            'regions': data['regions']
        })

    # Sort by cost descending
    regions_list.sort(key=lambda x: x['total_cost'], reverse=True)
    vendors_list.sort(key=lambda x: x['total_cost'], reverse=True)

    return {
        'total_cost': round(total_cost, 2),
        'total_records': len([r for r in records if parse_cost(r.get('installation_cost'))]),
        'regions': regions_list,
        'vendors': vendors_list,
    }
