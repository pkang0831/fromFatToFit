"""Guest endpoints — no authentication required, IP-rate-limited."""

from fastapi import APIRouter, HTTPException, status
from starlette.requests import Request
import logging

from ..schemas.body_schemas import GuestScanRequest, GuestScanResponse
from ..rate_limit import limiter
from .body import estimate_body_fat_with_fallback

logger = logging.getLogger(__name__)
router = APIRouter()


def _bf_category_and_insight(bf: float, gender: str) -> tuple[str, str]:
    if gender == "male":
        if bf < 8:
            return "Competition", "Extremely lean — typical of bodybuilding stage condition, not sustainable long-term for most people."
        if bf < 12:
            return "Athletic", "Leaner than most regular gym-goers. Visible muscle definition."
        if bf < 16:
            return "Fit", "Healthy and fit range with good muscle definition."
        if bf < 20:
            return "Healthy", "Average for an active male. A solid baseline to build from."
        if bf < 25:
            return "Average", "Slightly above average. Structured training could show visible changes in 6-8 weeks."
        return "Above Average", "A consistent plan could make a visible difference in 8-12 weeks."
    else:
        if bf < 14:
            return "Competition", "Extremely lean — may affect hormone balance. Not sustainable for most people."
        if bf < 18:
            return "Athletic", "Leaner than most active women. Visible muscle tone."
        if bf < 23:
            return "Fit", "Healthy and toned. Good body composition."
        if bf < 28:
            return "Healthy", "Average for an active female. A solid baseline to build from."
        if bf < 33:
            return "Average", "Slightly above average. Consistent effort could show visible changes in 6-8 weeks."
        return "Above Average", "A structured plan could make a visible difference in 8-12 weeks."


@router.post("/body-scan", response_model=GuestScanResponse)
@limiter.limit("3/day")
async def guest_body_scan(request: Request, scan_request: GuestScanRequest):
    """
    Free body-fat estimate — no account required.
    Limited to 3 scans per day per IP.  Result is not stored.
    """
    try:
        analysis = await estimate_body_fat_with_fallback(
            scan_request.image_base64,
            scan_request.gender,
            scan_request.age,
        )

        bf = analysis["body_fat_percentage"]
        confidence = analysis.get("confidence", "medium")
        category, insight = _bf_category_and_insight(bf, scan_request.gender)

        return GuestScanResponse(
            body_fat_percentage=bf,
            confidence=confidence,
            category=category,
            insight=insight,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Guest body scan error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Body scan failed. Please try again.",
        )
