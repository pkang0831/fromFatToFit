"""
Replicate service for body transformation using FLUX Kontext Pro.
Generates body transformation previews by editing the uploaded photo.
"""

import base64
import io
import logging

from PIL import Image, ImageOps

from .replicate_utils import (
    curl_json,
    poll_prediction,
    image_to_data_uri,
    download_to_base64,
    get_replicate_api_key,
)

logger = logging.getLogger(__name__)

REPLICATE_MODELS_API = "https://api.replicate.com/v1/models"
FLUX_KONTEXT_MODEL = "black-forest-labs/flux-kontext-pro"


def _normalize_image(image_base64: str) -> tuple[str, int, int]:
    """
    Strip EXIF orientation, re-encode as JPEG, and return
    (clean_base64, width, height) so aspect ratio is deterministic.
    """
    raw = base64.b64decode(image_base64)
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img) or img
    img = img.convert("RGB")
    w, h = img.size
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    clean_b64 = base64.b64encode(buf.getvalue()).decode()
    return clean_b64, w, h


def _match_orientation(transformed_b64: str, target_w: int, target_h: int) -> str:
    """
    If the output image orientation doesn't match the original,
    rotate it to match.
    """
    raw = base64.b64decode(transformed_b64)
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img) or img
    img = img.convert("RGB")
    ow, oh = img.size

    original_is_portrait = target_h > target_w
    output_is_portrait = oh > ow

    if original_is_portrait != output_is_portrait:
        logger.info(
            f"Orientation mismatch: original {target_w}x{target_h}, "
            f"output {ow}x{oh} — rotating output"
        )
        img = img.rotate(90 if original_is_portrait else -90, expand=True)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return base64.b64encode(buf.getvalue()).decode()


def _build_prompt(current_bf: float, target_bf: float, gender: str) -> tuple[str, str]:
    """
    Build a calibrated prompt that scales intensity with BF% delta.
    Returns (prompt, direction).
    """
    bf_diff = abs(current_bf - target_bf)
    direction = "cutting" if current_bf > target_bf else "bulking"

    if bf_diff <= 3:
        intensity = "subtly"
        muscle_adj = "slightly more visible"
        fat_adj = "a touch leaner"
    elif bf_diff <= 7:
        intensity = "noticeably"
        muscle_adj = "more defined and visible"
        fat_adj = "leaner with less subcutaneous fat"
    else:
        intensity = "significantly"
        muscle_adj = "well-defined and prominent"
        fat_adj = "much leaner with visible separation"

    if direction == "cutting":
        prompt = (
            f"Edit this photo to show the same person {intensity} leaner at "
            f"approximately {target_bf:.0f}% body fat. "
            f"Make the midsection {fat_adj} and muscles {muscle_adj}. "
            f"Keep the exact same person, same face, same pose, same clothing, "
            f"same background, same lighting. Realistic photo."
        )
    else:
        prompt = (
            f"Edit this photo to show the same person with {intensity} more "
            f"muscle mass at approximately {target_bf:.0f}% body fat. "
            f"Add visible size to arms, chest, and shoulders. "
            f"Keep the exact same person, same face, same pose, same clothing, "
            f"same background, same lighting. Realistic photo."
        )

    return prompt, direction


async def generate_body_transformation(
    image_base64: str,
    current_bf: float,
    target_bf: float,
    gender: str,
) -> dict:
    """
    Generate a body transformation preview using FLUX Kontext Pro.
    Takes the user's photo and edits it to show a different body fat percentage.
    """
    api_key = get_replicate_api_key()

    clean_b64, orig_w, orig_h = _normalize_image(image_base64)
    data_uri = image_to_data_uri(clean_b64)

    prompt, direction = _build_prompt(current_bf, target_bf, gender)

    bf_diff = abs(current_bf - target_bf)
    if direction == "cutting":
        muscle_estimate = f"+{max(1, int(bf_diff * 0.3))}kg lean mass"
    else:
        muscle_estimate = f"+{max(2, int(bf_diff * 0.5))}kg muscle"

    if orig_h > orig_w:
        aspect = "3:4"
    elif orig_w > orig_h:
        aspect = "4:3"
    else:
        aspect = "1:1"

    logger.info(
        f"Transformation: {current_bf:.1f}% -> {target_bf:.1f}% BF "
        f"({direction}), image {orig_w}x{orig_h}, aspect {aspect}"
    )

    create_url = f"{REPLICATE_MODELS_API}/{FLUX_KONTEXT_MODEL}/predictions"
    prediction = curl_json("POST", create_url, api_key, {
        "input": {
            "prompt": prompt,
            "input_image": data_uri,
            "aspect_ratio": aspect,
            "safety_tolerance": 5,
            "output_format": "jpg",
            "output_quality": 90,
        },
    })

    poll_url = prediction.get("urls", {}).get("get")
    if not poll_url:
        raise RuntimeError(f"No poll URL in prediction response: {prediction}")

    result = await poll_prediction(poll_url, api_key, max_polls=60, interval=3.0)

    output = result.get("output")
    if not output:
        raise RuntimeError("No output from FLUX Kontext")

    output_url = output if isinstance(output, str) else output[0] if isinstance(output, list) else None
    if not output_url:
        raise RuntimeError(f"Unexpected output format: {type(output)}")

    transformed_b64 = download_to_base64(output_url)
    transformed_b64 = _match_orientation(transformed_b64, orig_w, orig_h)
    transformed_data_uri = image_to_data_uri(transformed_b64, "jpeg")

    return {
        "transformed_image_url": transformed_data_uri,
        "direction": direction,
        "muscle_gain_estimate": muscle_estimate,
    }


async def controlnet_transform_region(
    image_base64: str,
    mask_base64: str,
    body_part: str,
    goal: str,
    gender: str,
    intensity: str = "moderate",
) -> dict:
    """Region-specific transformation using FLUX Kontext with targeted prompt."""
    api_key = get_replicate_api_key()

    clean_b64, orig_w, orig_h = _normalize_image(image_base64)
    data_uri = image_to_data_uri(clean_b64)

    intensity_map = {"subtle": "slightly", "moderate": "noticeably", "dramatic": "significantly"}
    level = intensity_map.get(intensity, "noticeably")

    goal_map = {
        "bigger": f"Make the {body_part} {level} bigger and more muscular",
        "leaner": f"Make the {body_part} {level} leaner and more defined",
        "more_defined": f"Make the {body_part} {level} more defined with visible muscle striations",
        "slimmer": f"Make the {body_part} {level} slimmer and more toned",
    }

    prompt = (
        f"{goal_map.get(goal, f'Transform the {body_part}')}. "
        f"Keep everything else exactly the same — same person, same face, pose, clothing, background. "
        f"Realistic photo edit."
    )

    direction_map = {
        "bigger": "muscle_gain",
        "leaner": "fat_loss",
        "more_defined": "definition",
        "slimmer": "fat_loss",
    }

    if orig_h > orig_w:
        aspect = "3:4"
    elif orig_w > orig_h:
        aspect = "4:3"
    else:
        aspect = "1:1"

    create_url = f"{REPLICATE_MODELS_API}/{FLUX_KONTEXT_MODEL}/predictions"
    prediction = curl_json("POST", create_url, api_key, {
        "input": {
            "prompt": prompt,
            "input_image": data_uri,
            "aspect_ratio": aspect,
            "safety_tolerance": 5,
            "output_format": "jpg",
            "output_quality": 90,
        },
    })

    poll_url = prediction.get("urls", {}).get("get")
    if not poll_url:
        raise RuntimeError(f"No poll URL: {prediction}")

    result = await poll_prediction(poll_url, api_key, max_polls=60, interval=3.0)

    output = result.get("output")
    output_url = output if isinstance(output, str) else output[0] if isinstance(output, list) else None
    if not output_url:
        raise RuntimeError("No output from region transform")

    transformed_b64 = download_to_base64(output_url)
    transformed_b64 = _match_orientation(transformed_b64, orig_w, orig_h)
    transformed_data_uri = image_to_data_uri(transformed_b64, "jpeg")

    return {
        "transformed_image_url": transformed_data_uri,
        "body_part": body_part,
        "goal": goal,
        "direction": direction_map.get(goal, "definition"),
    }
