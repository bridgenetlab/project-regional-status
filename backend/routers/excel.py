"""API routes for Excel file handling and data retrieval."""

from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from models.schemas import (
    UploadResponse, OverviewResponse, BranchListResponse, TimelineResponse, HealthResponse, CostingResponse
)
from services import parser, metrics, session

router = APIRouter(prefix='/v1', tags=['data'])


@router.get('/health', response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Docker."""
    return HealthResponse(status='ok')


@router.post('/upload', response_model=UploadResponse)
async def upload_excel(file: UploadFile = File(...)):
    """
    Accept Excel file upload, parse it, and store in session.
    Returns session_id and metadata.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail='File must be .xlsx or .xls')

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to read file: {str(e)}')

    try:
        data_rows, columns_detected, warnings = parser.parse_excel_file(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error parsing Excel file: {str(e)}")
        raise HTTPException(status_code=400, detail=f'Error parsing Excel file: {str(e)}')

    # Enrich with computed metrics
    data_rows = metrics.enrich_records_with_metrics(data_rows)

    # Create session
    session_id = session.create_session(data_rows)

    # Check for missing required columns
    detected_keys = set(k for k in parser.COLUMN_ALIASES.keys()
                       if any(h.strip().lower() in parser.COLUMN_ALIASES[k]
                             for h in columns_detected if h))
    missing_required = [col for col in parser.REQUIRED_COLUMNS
                       if col not in detected_keys]

    return UploadResponse(
        session_id=session_id,
        row_count=len(data_rows),
        columns_detected=columns_detected,
        missing_required=missing_required,
        warnings=warnings,
    )


@router.get('/overview', response_model=OverviewResponse)
async def get_overview(session_id: str = Query(...)):
    """Get global KPI summary and regional breakdown."""
    data = session.get_session(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail='Session not found')

    global_summary = metrics.compute_global_summary(data)
    regional_summaries = metrics.compute_regional_summary(data)

    return OverviewResponse(
        session_id=session_id,
        summary=global_summary,
        regions=list(regional_summaries.values()),
    )


@router.get('/branches', response_model=BranchListResponse)
async def get_branches(
    session_id: str = Query(...),
    region: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    site_readiness: str = Query(None),
    uat_document: str = Query(None),
    sort_by: str = Query('branch_name'),
    sort_dir: str = Query('asc'),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=1000),
):
    """Get paginated, filtered branch records."""
    data = session.get_session(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail='Session not found')

    # Apply filters
    filtered = metrics.filter_branches(data, region=region, status=status, search=search, site_readiness=site_readiness, uat_document=uat_document)

    # Apply sort
    sorted_branches = metrics.sort_branches(filtered, sort_by=sort_by, sort_dir=sort_dir)

    # Apply pagination
    page_records, total = metrics.paginate_branches(sorted_branches, page=page, per_page=per_page)

    # Convert to Pydantic models - convert all values to safe types
    from models.schemas import BranchRecord
    branch_models = []
    for record in page_records:
        # Sanitize record to ensure all values can be serialized
        safe_record = {
            k: str(v) if v is not None and k not in ['cisco_9851', 'cisco_9841', 'no', 'days_delta'] else v
            for k, v in record.items()
        }
        try:
            branch_models.append(BranchRecord(**safe_record))
        except Exception as e:
            # Log error but continue with raw dict if Pydantic validation fails
            print(f"Warning: Could not validate record for {record.get('branch_name')}: {str(e)}")
            branch_models.append(BranchRecord(**record))

    return BranchListResponse(
        total=total,
        page=page,
        per_page=per_page,
        branches=branch_models,
    )


@router.get('/timeline', response_model=TimelineResponse)
async def get_timeline(
    session_id: str = Query(...),
    region: str = Query(None),
    limit: int = Query(50, ge=1, le=1000),
):
    """Get branches sorted by days_delta (most behind first) for timeline view."""
    data = session.get_session(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail='Session not found')

    # Apply region filter if provided
    filtered = metrics.filter_branches(data, region=region) if region else data

    # Sort by days_delta descending (most behind first, None values at end)
    sorted_branches = sorted(
        filtered,
        key=lambda r: (r.get('days_delta') is None, -(r.get('days_delta') or 0))
    )

    # Apply limit
    limited = sorted_branches[:limit]

    # Compute summary stats
    days_deltas = [r['days_delta'] for r in limited if r['days_delta'] is not None]
    summary = {
        'worst_delay': max(days_deltas) if days_deltas else None,
        'best_performance': min(days_deltas) if days_deltas else None,
        'avg_delta': (sum(days_deltas) / len(days_deltas)) if days_deltas else None,
    }

    # Convert to Pydantic models - convert all values to safe types
    from models.schemas import BranchRecord
    branch_models = []
    for record in limited:
        # Sanitize record to ensure all values can be serialized
        safe_record = {
            k: str(v) if v is not None and k not in ['cisco_9851', 'cisco_9841', 'no', 'days_delta'] else v
            for k, v in record.items()
        }
        try:
            branch_models.append(BranchRecord(**safe_record))
        except Exception as e:
            # Log error but continue with raw dict if Pydantic validation fails
            print(f"Warning: Could not validate record for {record.get('branch_name')}: {str(e)}")
            branch_models.append(BranchRecord(**record))

    return TimelineResponse(
        session_id=session_id,
        total=len(limited),
        branches=branch_models,
        summary=summary,
    )


@router.get('/costing', response_model=CostingResponse)
async def get_costing(
    session_id: str = Query(...),
    region: str = Query(None),
):
    """Get installation costing summary by region and vendor."""
    data = session.get_session(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail='Session not found')

    # Apply region filter if provided
    filtered = metrics.filter_branches(data, region=region) if region else data

    # Compute costing summary
    costing = metrics.compute_costing_summary(filtered)

    return CostingResponse(
        session_id=session_id,
        **costing
    )


@router.delete('/session')
async def delete_session(session_id: str = Query(...)):
    """Clear a session (delete stored data)."""
    if session.delete_session(session_id):
        return {'status': 'deleted'}
    raise HTTPException(status_code=404, detail='Session not found')
