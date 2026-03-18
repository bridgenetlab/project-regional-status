"""Pydantic response models for the API."""

from typing import Optional
from pydantic import BaseModel


class BranchRecord(BaseModel):
    """A single branch/site record with all columns and computed metrics."""
    no: Optional[int] = None
    branch_name: Optional[str] = None
    status: Optional[str] = None
    planned_start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    actual_end_date: Optional[str] = None
    expected_delivery: Optional[str] = None
    delivery_status: Optional[str] = None
    site_readiness: Optional[str] = None
    installation_date: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    pic: Optional[str] = None
    voice_gateway: Optional[str] = None
    cisco_9851: Optional[int | str] = None
    cisco_9841: Optional[int | str] = None
    poe: Optional[str] = None
    field_engineer: Optional[str] = None
    hp: Optional[str] = None
    ic: Optional[str] = None
    voip_ip: Optional[str] = None
    gateway: Optional[str] = None
    note: Optional[str] = None
    physical_phone_installation: Optional[str] = None
    issue: Optional[str] = None
    dependency: Optional[str] = None
    uat_document: Optional[str] = None
    installation_cost: Optional[float | str] = None
    installation_vendor: Optional[str] = None
    # Computed fields
    days_delta: Optional[int] = None
    schedule_status: Optional[str] = None

    class Config:
        """Allow arbitrary types for flexibility."""
        arbitrary_types_allowed = True


class RegionSummary(BaseModel):
    """Summary stats for a single region."""
    region: str
    total: int
    completed: int
    in_progress: int
    not_started: int
    completion_rate: float
    avg_days_delta: Optional[float] = None
    behind_schedule: int = 0
    ahead_of_schedule: int = 0
    on_schedule: int = 0


class GlobalSummary(BaseModel):
    """Global KPI summary across all branches."""
    total_branches: int
    completed: int
    in_progress: int
    not_started: int
    completion_rate: float
    avg_days_delta: Optional[float] = None
    behind_schedule: int = 0
    ahead_of_schedule: int = 0
    on_schedule: int = 0
    site_readiness_under_renovation: int = 0
    pending_uat: int = 0
    delivery_status_count: dict = {}


class UploadResponse(BaseModel):
    """Response from Excel file upload."""
    session_id: str
    row_count: int
    columns_detected: list[str]
    missing_required: list[str]
    warnings: list[str] = []


class OverviewResponse(BaseModel):
    """Response for overview dashboard."""
    session_id: str
    summary: GlobalSummary
    regions: list[RegionSummary]


class BranchListResponse(BaseModel):
    """Paginated branch list response."""
    total: int
    page: int
    per_page: int
    branches: list[BranchRecord]


class TimelineResponse(BaseModel):
    """Timeline view response - branches sorted by days_delta."""
    session_id: str
    total: int
    branches: list[BranchRecord]
    summary: dict  # {worst_delay, best_performance, avg_delta}


class HealthResponse(BaseModel):
    """Health check response."""
    status: str


class RegionCost(BaseModel):
    """Region costing breakdown."""
    region: str
    total_cost: float
    count: int
    avg_cost: float
    vendors: dict = {}


class VendorCost(BaseModel):
    """Vendor costing breakdown."""
    vendor: str
    total_cost: float
    count: int
    avg_cost: float
    regions: dict = {}


class CostingResponse(BaseModel):
    """Installation costing dashboard response."""
    session_id: str
    total_cost: float
    total_records: int
    regions: list[RegionCost]
    vendors: list[VendorCost]
