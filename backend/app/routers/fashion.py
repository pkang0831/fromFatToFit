import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from ..dependencies import get_current_user
from ..services import fashion_service
from ..services.usage_limiter import get_credit_balance
from ..services.payment_service import deduct_credits
from ..rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()

FASHION_TOTAL_COST = 20


class FashionRecommendRequest(BaseModel):
    season: str  # spring, summer, fall, winter
    gender: str = "female"
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    body_notes: str = ""
    personal_color: str = ""
    best_colors: str = ""
    avoid_colors: str = ""
    face_shape: str = ""
    forehead_ratio: str = ""
    cheekbone_ratio: str = ""
    jawline_ratio: str = ""
    chin_type: str = ""
    skin_tone: str = ""
    skin_undertone: str = ""
    image_base64: Optional[str] = None
    generate_images: bool = False


class FashionRecommendResponse(BaseModel):
    season: str
    outfits: List[Dict[str, Any]]
    credits_used: int = 0


@router.post("/recommend", response_model=FashionRecommendResponse)
@limiter.limit("5/minute")
async def recommend_fashion(
    request: Request,
    body: FashionRecommendRequest,
    user=Depends(get_current_user),
):
    """Get seasonal outfit recommendations with AI-generated outfit images."""
    user_id = user["id"]

    balance = await get_credit_balance(user_id)
    if balance["total_credits"] < FASHION_TOTAL_COST:
        raise HTTPException(
            status_code=402,
            detail=f"Not enough credits. Need {FASHION_TOTAL_COST}, have {balance['total_credits']}.",
        )

    try:
        result = await fashion_service.recommend_outfits(
            gender=body.gender,
            season=body.season,
            height_cm=body.height_cm,
            weight_kg=body.weight_kg,
            body_notes=body.body_notes,
            personal_color=body.personal_color,
            best_colors=body.best_colors,
            avoid_colors=body.avoid_colors,
            face_shape=body.face_shape,
            forehead_ratio=body.forehead_ratio,
            cheekbone_ratio=body.cheekbone_ratio,
            jawline_ratio=body.jawline_ratio,
            chin_type=body.chin_type,
            skin_tone=body.skin_tone,
            skin_undertone=body.skin_undertone,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Fashion recommendation failed: {e}")
        raise HTTPException(status_code=500, detail="Fashion recommendation failed")

    outfits = result.get("outfits", [])

    if outfits:
        try:
            outfits = await fashion_service.generate_outfit_images(
                body.image_base64,
                outfits,
                body.gender,
            )
        except Exception as e:
            logger.error(f"Outfit image generation failed: {e}")

    await deduct_credits(user_id, FASHION_TOTAL_COST, "fashion_styling")

    return FashionRecommendResponse(
        season=body.season,
        outfits=outfits,
        credits_used=FASHION_TOTAL_COST,
    )
