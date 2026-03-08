from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class BodyScanRequest(BaseModel):
    image_base64: str
    scan_type: str = Field(..., description="bodyfat, percentile, or transformation")
    gender: Optional[str] = None
    age: Optional[int] = None
    ethnicity: Optional[str] = None
    height_cm: Optional[float] = None
    target_bf_reduction: Optional[float] = Field(None, description="Deprecated — use target_bf instead")
    target_bf: Optional[float] = Field(None, description="Target body fat percentage")
    enhancement_level: Optional[str] = Field(None, description="subtle, natural, or studio")


class BodyFatEstimateResponse(BaseModel):
    body_fat_percentage: float
    confidence: str = Field(description="low, medium, high")
    recommendations: List[str]
    scan_id: str
    usage_remaining: int


class PercentileData(BaseModel):
    percentile: float = Field(..., ge=0, le=100)
    rank_text: str = Field(description="e.g., 'top 15%'")
    comparison_group: str
    body_fat_percentage: float


class PercentileResponse(BaseModel):
    percentile_data: PercentileData
    distribution_data: Dict[str, Any] = Field(description="Data for bell curve visualization")
    scan_id: str
    usage_remaining: int


class TransformationResponse(BaseModel):
    original_image_url: str = ""
    transformed_image_url: str
    current_bf: Optional[float] = None
    target_bf: Optional[float] = None
    direction: Optional[str] = None
    muscle_gain_estimate: Optional[str] = None
    estimated_timeline_weeks: int = 0
    recommendations: List[str] = []
    progress_frames: Optional[List[str]] = None
    scan_id: Optional[str] = None


class EnhancementResponse(BaseModel):
    original_image_url: str
    enhanced_image_url: str
    enhancement_level: str
    scan_id: str


class SegmentRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded body photo (no data: prefix)")
    click_x: float = Field(..., ge=0.0, le=1.0, description="Normalized x coordinate of click (0=left, 1=right)")
    click_y: float = Field(..., ge=0.0, le=1.0, description="Normalized y coordinate of click (0=top, 1=bottom)")


class SegmentResponse(BaseModel):
    mask_base64: str = Field(..., description="Base64 PNG mask (white=selected, black=background)")
    body_part_guess: str = Field(..., description="AI guess of the body part: shoulders, chest, abs, arms, etc.")
    mask_area_pct: float = Field(..., description="Percentage of image covered by mask")


class RegionTransformRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded body photo")
    mask_base64: str = Field(..., description="Base64 PNG mask from segmentation (possibly user-refined)")
    body_part: str = Field(..., description="Body part label: shoulders, chest, abs, arms, back, thighs, legs")
    goal: str = Field(..., description="Transformation goal: bigger, leaner, more_defined, slimmer")
    gender: str = Field(default="male", description="male or female")
    intensity: str = Field(default="moderate", description="subtle, moderate, or dramatic")


class RegionTransformResponse(BaseModel):
    transformed_image_url: str = Field(..., description="Data URI of the composited result")
    body_part: str
    goal: str
    direction: str = Field(..., description="fat_loss, muscle_gain, or definition")


class BodyScanHistoryItem(BaseModel):
    id: str
    scan_type: str
    date: datetime
    result_summary: str
    image_url: Optional[str]


class ScanHistoryPoint(BaseModel):
    date: str
    bf: float


class GapToGoalResponse(BaseModel):
    current_bf: Optional[float] = None
    target_bf: Optional[float] = None
    goal_image_url: Optional[str] = None
    gap: Optional[float] = None
    scan_count: int = 0
    last_scan_date: Optional[str] = None
    scan_history: List[ScanHistoryPoint] = []


class SaveGoalRequest(BaseModel):
    goal_image_url: str
    target_bf: float


class GuestScanRequest(BaseModel):
    image_base64: str
    gender: str = Field(..., description="male or female")
    age: int = Field(..., ge=10, le=100)


class GuestScanResponse(BaseModel):
    body_fat_percentage: float
    confidence: str
    category: str
    insight: str


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    activity_level: Optional[str] = None
    calorie_goal: Optional[float] = None
    onboarding_completed: Optional[bool] = None
    consent_terms_at: Optional[str] = None
    consent_privacy_at: Optional[str] = None
    consent_sensitive_data_at: Optional[str] = None
    consent_age_verified_at: Optional[str] = None
    consent_version: Optional[str] = None
