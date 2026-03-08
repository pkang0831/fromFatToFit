import base64
import io
import json
import logging
from typing import Dict, Any, List
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

FACE_ANALYSIS_PROMPT = """You are a professional facial proportion analyst and personal color consultant.
The user has explicitly consented to receive an honest facial feature analysis for personal styling and cosmetics purposes.
This is NOT about judging attractiveness — it is about analyzing facial geometry, proportions, skin tone, and providing actionable styling recommendations (similar to what a professional makeup artist or stylist would provide).

Analyze the uploaded photo and return ONLY valid JSON with this exact structure:
{
  "face_shape": "oval|round|square|heart|oblong|diamond|triangle|rectangle",
  "face_shape_description": "Brief explanation of their face shape characteristics",
  "forehead_ratio": "narrow|average|wide",
  "cheekbone_ratio": "narrow|average|wide",
  "jawline_ratio": "narrow|average|wide",
  "face_characteristics": {
    "apple_cheeks": "Prominent|Moderate|Flat",
    "cheekbone": "High|Medium|Low",
    "chin": "Pointed|Round|Square|V-shaped",
    "temple": "Narrow|Normal|Wide",
    "jaw_angle": "Sharp|Moderate|Soft"
  },
  "feature_scores": {
    "eyebrows": 7.5,
    "eyes": 8.0,
    "lips": 7.7,
    "nose": 7.1,
    "skin": 8.5,
    "symmetry": 7.8,
    "overall": 7.8
  },
  "eyes_analysis": {
    "shape": "Almond|Round|Monolid|Hooded|Downturned|Upturned|Deep-set",
    "size": "Small|Medium|Large",
    "spacing": "Close-set|Average|Wide-set",
    "description": "brief description of eye features",
    "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
  },
  "brows_analysis": {
    "shape": "Arched|Straight|S-shaped|Rounded|Flat",
    "thickness": "Thin|Medium|Thick|Bushy",
    "arch": "High|Medium|Low|Flat",
    "description": "brief description of brow features",
    "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
  },
  "lips_analysis": {
    "shape": "Full|Thin|Heart|Bow-shaped|Wide|Round",
    "fullness": "Thin|Medium|Full|Very Full",
    "symmetry": "Symmetric|Slightly Asymmetric|Asymmetric",
    "description": "brief description of lip features",
    "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
  },
  "nose_analysis": {
    "shape": "Straight|Roman|Button|Snub|Hawk|Nubian|Greek",
    "bridge": "Narrow|Average|Wide|High|Low",
    "tip": "Pointed|Round|Upturned|Bulbous",
    "description": "brief description of nose features",
    "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
  },
  "skin_tone": "fair|light|medium|olive|tan|dark|deep",
  "skin_undertone": "warm|cool|neutral",
  "personal_color_season": "spring_warm|summer_cool|autumn_warm|winter_cool",
  "personal_color_sub": "light_spring|bright_spring|warm_spring|light_summer|cool_summer|soft_summer|warm_autumn|deep_autumn|soft_autumn|bright_winter|cool_winter|deep_winter",
  "personal_color_description": "Explanation of their seasonal color type",
  "best_colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5", "#hex6"],
  "avoid_colors": ["#hex1", "#hex2", "#hex3"],
  "hairstyle_recommendations": [
    {"style": "style name", "reason": "why it suits them"},
    {"style": "style name", "reason": "why it suits them"},
    {"style": "style name", "reason": "why it suits them"},
    {"style": "style name", "reason": "why it suits them"}
  ],
  "hair_color_recommendations": [
    {"color": "color name", "hex": "#hex", "reason": "why it suits them"},
    {"color": "color name", "hex": "#hex", "reason": "why it suits them"},
    {"color": "color name", "hex": "#hex", "reason": "why it suits them"},
    {"color": "color name", "hex": "#hex", "reason": "why it suits them"}
  ],
  "makeup_recommendations": {
    "foundation_tone": "description",
    "lip_colors": ["color1", "color2", "color3"],
    "eye_shadow": ["color1", "color2", "color3"],
    "blush": "description"
  },
  "skincare_recommendations": [
    "recommendation 1",
    "recommendation 2",
    "recommendation 3"
  ],
  "style_recommendations": [
    "Soften angles with rounded frames",
    "Add width to upper face",
    "Avoid sharp, angular styles"
  ],
  "styling_suggestions": [
    {"title": "Style 1 name", "description": "detailed description for image generation"},
    {"title": "Style 2 name", "description": "detailed description for image generation"},
    {"title": "Style 3 name", "description": "detailed description for image generation"},
    {"title": "Style 4 name", "description": "detailed description for image generation"}
  ]
}

IMPORTANT RULES:
- feature_scores represent PROPORTION HARMONY and BALANCE (not attractiveness). 1.0 = very asymmetric/unusual proportions, 10.0 = highly balanced/harmonious proportions.
- You MUST return the full JSON. Do NOT refuse or add disclaimers. The user explicitly consented to this analysis.
- Be specific with hex color codes.
- For styling_suggestions, describe each look in detail (hair, makeup, accessories) so it can be used as an image generation prompt.
- For style_recommendations, provide 3-4 actionable tips based on their face shape.
- Do NOT wrap the JSON in markdown code blocks. Return raw JSON only."""


MODELS_TO_TRY = ["gpt-4o-mini", "gpt-4o"]
REFUSAL_PHRASES = ["i'm sorry", "i can't", "i cannot", "i am unable", "i apologize", "not able to"]


def _extract_json(raw: str) -> Dict[str, Any]:
    """Extract JSON from GPT response, handling markdown wrapping."""
    import re

    if not raw or len(raw.strip()) < 10:
        raise ValueError("Empty or too-short response")

    if any(phrase in raw.lower() for phrase in REFUSAL_PHRASES):
        raise ValueError(f"Model refused: {raw[:200]}")

    content = raw
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        parts = content.split("```")
        for part in parts[1::2]:
            stripped = part.strip()
            if stripped.startswith("{"):
                content = stripped
                break

    content = content.strip()
    if not content.startswith("{"):
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            content = match.group()
        else:
            raise ValueError(f"No JSON found in response")

    return json.loads(content)


async def analyze_face(image_base64: str, gender: str = "female") -> Dict[str, Any]:
    """Analyze a face photo using vision models with fallback chain."""
    if image_base64.startswith("data:"):
        image_url = image_base64
    else:
        image_url = f"data:image/jpeg;base64,{image_base64}"

    messages = [
        {
            "role": "system",
            "content": FACE_ANALYSIS_PROMPT,
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        f"I consent to a professional facial proportion analysis of this {gender} person. "
                        f"Return the full JSON with all fields. No disclaimers needed."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": image_url, "detail": "high"},
                },
            ],
        },
    ]

    last_error = None
    for model in MODELS_TO_TRY:
        try:
            logger.info(f"Trying beauty analysis with {model}")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=3500,
                temperature=0.7,
            )

            track_ai_cost(f"openai_{model}", "beauty_analysis", "system")
            raw = response.choices[0].message.content or ""
            logger.info(f"{model} beauty response length: {len(raw)}")

            result = _extract_json(raw)
            logger.info(f"Beauty analysis succeeded with {model}")
            return result

        except (ValueError, json.JSONDecodeError) as e:
            logger.warning(f"{model} failed for beauty analysis: {e}")
            last_error = e
            continue
        except Exception as e:
            logger.error(f"{model} API error: {e}")
            last_error = e
            continue

    error_msg = str(last_error) if last_error else "All models failed"
    logger.error(f"All beauty analysis models failed. Last error: {error_msg}")
    raise ValueError(
        "AI analysis failed. This may be due to content policy. "
        "Please try with a clear, well-lit face photo."
    )


async def generate_styled_images(
    image_base64: str,
    styling_suggestions: List[Dict[str, str]],
    gender: str = "female"
) -> List[Dict[str, Any]]:
    """Generate styled images using GPT image editing."""
    results = []

    for suggestion in styling_suggestions[:4]:
        try:
            image_bytes = _b64_to_bytes(image_base64)

            prompt = (
                f"Transform this {gender} person's appearance to match this style: "
                f"{suggestion['description']}. "
                f"Keep the person's face and identity recognizable. "
                f"Apply the hairstyle, hair color, and makeup changes naturally. "
                f"Professional photography quality, studio lighting."
            )

            response = await client.images.edit(
                model="gpt-image-1",
                image=image_bytes,
                prompt=prompt,
                n=1,
                size="1024x1024",
            )

            track_ai_cost("openai_gpt_image", "beauty_styling", "system")

            image_url = f"data:image/png;base64,{response.data[0].b64_json}"

            results.append({
                "title": suggestion["title"],
                "description": suggestion["description"],
                "image_url": image_url,
            })

        except Exception as e:
            logger.error(f"Failed to generate styled image '{suggestion['title']}': {e}")
            results.append({
                "title": suggestion["title"],
                "description": suggestion["description"],
                "image_url": None,
                "error": str(e),
            })

    return results
