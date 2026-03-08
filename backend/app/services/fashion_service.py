import base64
import io
import json
import logging
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI
from ..config import settings
from .cost_tracker import track_ai_cost


def _b64_to_bytes(data: str) -> io.BytesIO:
    """Convert a base64 string (with or without data URI prefix) to BytesIO."""
    if data.startswith("data:"):
        data = data.split(",", 1)[1]
    buf = io.BytesIO(base64.b64decode(data))
    buf.name = "image.png"
    return buf

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.openai_api_key)

FASHION_PROMPT = """You are an elite fashion stylist who tailors every recommendation to the client's unique facial structure, body proportions, and personal color palette.

═══════════════════════════
CLIENT PROFILE
═══════════════════════════
Gender: {gender}
Height: {height_cm}cm
Weight: {weight_kg}
BMI category: {bmi_category}
Body notes: {body_notes}

═══════════════════════════
FACE ANALYSIS
═══════════════════════════
Face shape: {face_shape}
Forehead: {forehead_ratio} | Cheekbones: {cheekbone_ratio} | Jawline: {jawline_ratio}
Chin type: {chin_type}

═══════════════════════════
COLOR ANALYSIS
═══════════════════════════
Skin tone: {skin_tone}
Undertone: {skin_undertone}
Personal color season: {personal_color}
Best colors: {best_colors}
Colors to avoid: {avoid_colors}

═══════════════════════════
STYLING RULES — YOU MUST FOLLOW THESE
═══════════════════════════

1. FACE SHAPE → NECKLINE & ACCESSORIES
   - Round face → V-necks, vertical patterns, long necklaces to elongate; avoid crew necks
   - Square face → scoop necks, soft scarves, rounded collars to soften jaw; avoid boxy necklines
   - Heart face → boat necks, wide collars to balance narrow chin; avoid halter necks
   - Oblong face → crew necks, turtlenecks, horizontal patterns to add width; avoid deep V-necks
   - Oval face → most necklines work; highlight with statement pieces
   - Diamond face → bateau/boat necks to add shoulder width; avoid turtlenecks
   - Triangle face → off-shoulder, wide necklines to balance wider jaw; avoid narrow collars
   - Rectangle face → belted styles, peplum to create waist definition; avoid straight-cut tops

2. BODY PROPORTIONS → SILHOUETTE & FIT
   - Underweight/slim → layering, textured fabrics, structured pieces to add visual volume
   - Average → balanced proportions, classic fits
   - Overweight → vertical lines, monochrome outfits, well-structured fabrics, strategic layering
   - If height < 165cm → high-waist bottoms, cropped tops, vertical stripes, avoid oversized pieces
   - If height > 180cm → can carry oversized/relaxed fits, wide-leg pants, longer coats

3. PERSONAL COLOR → MUST USE THEIR BEST COLORS
   - Primary outfit colors MUST come from the client's "best colors" list
   - Accent pieces can introduce complementary tones
   - NEVER recommend colors from the "avoid" list

Explain in "color_reasoning" exactly WHY these colors suit the client's skin tone and undertone.
Explain in "fit_reasoning" HOW the silhouette flatters their face shape and body proportions.

For the "{season}" season, provide exactly 4 outfit recommendations.

Return ONLY valid JSON:
{{
  "season": "{season}",
  "outfits": [
    {{
      "style_name": "e.g. Smart Casual",
      "top": "specific top with neckline, material, fit, and color",
      "bottom": "specific bottom with cut, length, material, and color",
      "outerwear": "specific outerwear or null",
      "accessories": ["accessory chosen for face shape", "accessory2"],
      "color_palette": ["#hex1", "#hex2", "#hex3"],
      "color_reasoning": "why these colors suit the client's skin tone/undertone/personal color",
      "fit_reasoning": "how the silhouette flatters the client's face shape and body proportions",
      "occasion": "when to wear this",
      "image_prompt": "detailed description of full outfit on a person for image generation"
    }}
  ]
}}"""


async def recommend_outfits(
    gender: str,
    season: str,
    height_cm: Optional[float] = None,
    weight_kg: Optional[float] = None,
    body_notes: str = "",
    personal_color: str = "",
    best_colors: str = "",
    avoid_colors: str = "",
    face_shape: str = "",
    forehead_ratio: str = "",
    cheekbone_ratio: str = "",
    jawline_ratio: str = "",
    chin_type: str = "",
    skin_tone: str = "",
    skin_undertone: str = "",
) -> Dict[str, Any]:
    """Generate seasonal outfit recommendations using GPT-4o."""
    try:
        bmi_category = "unknown"
        if height_cm and weight_kg:
            bmi = weight_kg / ((height_cm / 100) ** 2)
            if bmi < 18.5:
                bmi_category = f"underweight (BMI {bmi:.1f})"
            elif bmi < 25:
                bmi_category = f"normal (BMI {bmi:.1f})"
            elif bmi < 30:
                bmi_category = f"overweight (BMI {bmi:.1f})"
            else:
                bmi_category = f"obese (BMI {bmi:.1f})"

        na = "not provided"
        prompt = FASHION_PROMPT.format(
            gender=gender,
            height_cm=height_cm or "unknown",
            weight_kg=f"{weight_kg}kg" if weight_kg else "unknown",
            bmi_category=bmi_category,
            body_notes=body_notes or na,
            personal_color=personal_color or "not analyzed — give generic seasonal advice",
            best_colors=best_colors or "not analyzed",
            avoid_colors=avoid_colors or "not analyzed",
            face_shape=face_shape or "not analyzed — give generic neckline advice",
            forehead_ratio=forehead_ratio or "unknown",
            cheekbone_ratio=cheekbone_ratio or "unknown",
            jawline_ratio=jawline_ratio or "unknown",
            chin_type=chin_type or "unknown",
            skin_tone=skin_tone or "not analyzed",
            skin_undertone=skin_undertone or "not analyzed",
            season=season,
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Give me 4 {season} outfit recommendations."},
            ],
            max_tokens=2000,
            temperature=0.8,
        )

        track_ai_cost("openai_gpt4o", "fashion_recommendation", "system")

        content = response.choices[0].message.content or ""
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]

        return json.loads(content.strip())

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse fashion JSON: {e}")
        raise ValueError("Failed to parse AI fashion results")
    except Exception as e:
        logger.error(f"Fashion recommendation failed: {e}")
        raise


async def generate_outfit_images(
    image_base64: Optional[str],
    outfits: List[Dict[str, Any]],
    gender: str = "female",
) -> List[Dict[str, Any]]:
    """Generate outfit images using GPT image editing.
    If no user image is provided, generates standalone outfit images."""
    results = []

    for outfit in outfits[:4]:
        try:
            prompt = outfit.get("image_prompt", "")
            if not prompt:
                prompt = (
                    f"A {gender} person wearing: {outfit.get('top', '')}, "
                    f"{outfit.get('bottom', '')}, {outfit.get('outerwear', '')}. "
                    f"Colors: {', '.join(outfit.get('color_palette', []))}. "
                    f"Professional fashion photography, full body shot, studio background."
                )

            if image_base64:
                image_bytes = _b64_to_bytes(image_base64)

                response = await client.images.edit(
                    model="gpt-image-1",
                    image=image_bytes,
                    prompt=f"Dress this person in: {prompt}. Keep face recognizable. Professional fashion photo.",
                    n=1,
                    size="1024x1024",
                )
            else:
                response = await client.images.generate(
                    model="gpt-image-1",
                    prompt=f"Fashion photo: {prompt}",
                    n=1,
                    size="1024x1024",
                )

            track_ai_cost("openai_gpt_image", "fashion_styling", "system")

            image_url = f"data:image/png;base64,{response.data[0].b64_json}"

            results.append({
                **outfit,
                "image_url": image_url,
            })

        except Exception as e:
            logger.error(f"Failed to generate outfit image '{outfit.get('style_name', '')}': {e}")
            results.append({
                **outfit,
                "image_url": None,
                "error": str(e),
            })

    return results
