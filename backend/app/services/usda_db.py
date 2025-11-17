from __future__ import annotations

import logging
import math
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

_DATASET_CANDIDATES = [
    Path(__file__).resolve().parents[1] / "data" / "fooddb_parquet" / "food_data.parquet",
]

_SEARCH_COLUMNS = [
    "fdc_id",
    "description",
    "brand_owner",
    "serving_size",
    "serving_size_unit",
    "kcal",
    "protein_g",
    "fat_g",
    "carb_g",
    "kcal_per_g",
    "protein_per_g",
    "fat_per_g",
    "carb_per_g",
    "branded_food_category",
]

_MACRO_COLUMNS = ["kcal", "protein_g", "fat_g", "carb_g", "sugar_g"]
_PER_GRAM_KEYS = ["kcal_per_g", "protein_per_g", "fat_per_g", "carb_per_g"]

_LOCK = threading.Lock()
_READY = threading.Event()
_DATAFRAME: Optional[pd.DataFrame] = None
_PREFIX_INDEX: Dict[str, pd.Index] = {}
_LOOKUP_BY_ID: Dict[int, Dict[str, Any]] = {}


def _get_series(frame: pd.DataFrame, column: str, default: Any) -> pd.Series:
    if column in frame.columns:
        series = frame[column]
        if not isinstance(series, pd.Series):
            series = pd.Series(series, index=frame.index)
    else:
        series = pd.Series(default, index=frame.index)
    return series.copy()


def _find_dataset_path() -> Path:
    for candidate in _DATASET_CANDIDATES:
        if candidate.exists():
            return candidate
    joined = ", ".join(str(path) for path in _DATASET_CANDIDATES)
    raise FileNotFoundError(f"Food dataset not found. Checked: {joined}")


def _coerce_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _prepare_dataframe(raw: pd.DataFrame) -> pd.DataFrame:
    frame = raw.copy()

    if "fdc_id" not in frame.columns:
        frame.insert(0, "fdc_id", range(1, len(frame) + 1))
    frame["fdc_id"] = _coerce_numeric(frame["fdc_id"])
    frame = frame[frame["fdc_id"].notna()].copy()
    frame["fdc_id"] = frame["fdc_id"].astype(int)

    frame["item"] = _get_series(frame, "item", "").fillna("").astype(str)

    if "description" in frame.columns:
        frame["description"] = _get_series(frame, "description", "").fillna("").astype(str)
    else:
        frame["description"] = frame["item"]
    frame["description_lower"] = frame["description"].str.lower()

    frame["brand_owner"] = _get_series(frame, "brand_owner", "").fillna("").astype(str)
    frame["brand_lower"] = frame["brand_owner"].str.lower()

    category_description = _get_series(frame, "category_description", pd.NA)
    if category_description.isna().all():
        category_description = _get_series(frame, "category", "")
    frame["category_description"] = category_description.fillna("").astype(str)

    frame["branded_food_category"] = _get_series(frame, "branded_food_category", "").fillna("").astype(str)

    frame["basis"] = _get_series(frame, "basis", "per_100g").fillna("per_100g").astype(str).str.lower()

    if "calories" in frame.columns and "kcal" not in frame.columns:
        frame["kcal"] = _coerce_numeric(_get_series(frame, "calories", pd.NA))
    if "carbs_g" in frame.columns and "carb_g" not in frame.columns:
        frame["carb_g"] = _coerce_numeric(_get_series(frame, "carbs_g", pd.NA))

    frame["serving_size"] = _coerce_numeric(_get_series(frame, "serving_size", 100.0)).fillna(100.0)
    default_units = frame["basis"].map({"per_100g": "g", "per_100ml": "ml"}).fillna("g")
    serving_unit_series = _get_series(frame, "serving_size_unit", pd.NA)
    serving_unit_series = serving_unit_series.fillna(default_units).astype(str)
    frame["serving_size_unit"] = serving_unit_series

    for column in _MACRO_COLUMNS + _PER_GRAM_KEYS:
        frame[column] = _coerce_numeric(_get_series(frame, column, pd.NA))

    mass_mask = frame["basis"] == "per_100g"
    volume_mask = frame["basis"] == "per_100ml"

    frame.loc[
        mass_mask & frame["kcal_per_g"].isna() & frame["kcal"].notna(),
        "kcal_per_g",
    ] = frame["kcal"] / 100.0
    frame.loc[
        mass_mask & frame["protein_per_g"].isna() & frame["protein_g"].notna(),
        "protein_per_g",
    ] = frame["protein_g"] / 100.0
    frame.loc[
        mass_mask & frame["fat_per_g"].isna() & frame["fat_g"].notna(),
        "fat_per_g",
    ] = frame["fat_g"] / 100.0
    frame.loc[
        mass_mask & frame["carb_per_g"].isna() & frame["carb_g"].notna(),
        "carb_per_g",
    ] = frame["carb_g"] / 100.0

    frame.loc[
        volume_mask & frame["kcal_per_g"].isna() & frame["kcal"].notna(),
        "kcal_per_g",
    ] = frame["kcal"] / 100.0
    frame.loc[
        volume_mask & frame["protein_per_g"].isna() & frame["protein_g"].notna(),
        "protein_per_g",
    ] = frame["protein_g"] / 100.0
    frame.loc[
        volume_mask & frame["fat_per_g"].isna() & frame["fat_g"].notna(),
        "fat_per_g",
    ] = frame["fat_g"] / 100.0
    frame.loc[
        volume_mask & frame["carb_per_g"].isna() & frame["carb_g"].notna(),
        "carb_per_g",
    ] = frame["carb_g"] / 100.0

    frame["data_type"] = _get_series(frame, "data_type", "sample_food").fillna("sample_food").astype(str)
    frame["prefix"] = frame["description_lower"].str[:3]

    return frame


def _ensure_dataset() -> pd.DataFrame:
    global _DATAFRAME, _PREFIX_INDEX, _LOOKUP_BY_ID
    if _DATAFRAME is not None and len(_LOOKUP_BY_ID) > 0:
        return _DATAFRAME

    with _LOCK:
        if _DATAFRAME is not None and len(_LOOKUP_BY_ID) > 0:
            return _DATAFRAME

        if _DATAFRAME is None:
            dataset_path = _find_dataset_path()
            logger.info("Loading food dataset from %s", dataset_path)
            raw = pd.read_parquet(dataset_path)
            frame = _prepare_dataframe(raw)
            _DATAFRAME = frame
        else:
            frame = _DATAFRAME

        _PREFIX_INDEX = {prefix: index for prefix, index in frame.groupby("prefix").indices.items()}
        _LOOKUP_BY_ID = {}
        for record in frame.to_dict("records"):
            fdc_id = record.get("fdc_id")
            if isinstance(fdc_id, (int, float)) and not math.isnan(fdc_id):
                record["fdc_id"] = int(fdc_id)
                _LOOKUP_BY_ID[int(fdc_id)] = record

        _READY.set()
        logger.info("Loaded %d foods (unique prefixes=%d, lookup entries=%d)", len(frame), len(_PREFIX_INDEX), len(_LOOKUP_BY_ID))
        return _DATAFRAME


def preload_usda_gold() -> None:
    if _READY.is_set():
        return
    try:
        _ensure_dataset()
    except FileNotFoundError as exc:
        logger.warning("Unable to preload food dataset: %s", exc)
    else:
        logger.info("Food dataset preloaded and ready")


def _clean_numeric(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and not math.isfinite(value):
            return None
        return float(value)
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _calculate_match_score(text: str, query_words: List[str]) -> float:
    """Calculate fuzzy match score for a text against query words.
    Higher score = better match.
    """
    if not text or not query_words:
        return 0.0
    
    text_lower = text.lower()
    score = 0.0
    
    # Check if all words are present
    words_found = sum(1 for word in query_words if word in text_lower)
    if words_found == 0:
        return 0.0
    
    # Base score: percentage of words found
    base_score = words_found / len(query_words)
    score += base_score * 100
    
    # Big bonus: ALL words must be present for good ranking
    if words_found == len(query_words):
        score += 500  # All words present = much higher priority
    
    # Bonus: exact phrase match (highest priority)
    full_query = " ".join(query_words)
    if full_query in text_lower:
        score += 1000
        # Extra bonus if it starts with the query
        if text_lower.startswith(full_query):
            score += 500
    
    # Bonus: words appear in order
    positions = []
    for word in query_words:
        pos = text_lower.find(word)
        if pos >= 0:
            positions.append(pos)
    
    if len(positions) == len(query_words):
        # All words found, check if in order
        if positions == sorted(positions):
            score += 200
            # Extra bonus if words are close together
            if len(positions) > 1:
                max_gap = max(positions[i+1] - positions[i] for i in range(len(positions)-1))
                if max_gap < 20:  # Words are close together
                    score += 100
    
    # Bonus: word appears early in text
    if positions:
        first_pos = min(positions)
        if first_pos < 10:
            score += 50
        elif first_pos < 30:
            score += 25
    
    # Penalty: very long text (prefer shorter, more specific matches)
    if len(text) > 100:
        score *= 0.9
    
    # Heavy penalty: if query has multiple words but not all are found
    if len(query_words) > 1 and words_found < len(query_words):
        score *= 0.1  # Very heavy penalty - prefer items with all words
    
    return score


def search_usda_foods(query: str, limit: int = 10, include_micronutrients: bool = False) -> List[Dict[str, Any]]:
    if not query or not query.strip():
        return []

    frame = _ensure_dataset()
    term = query.strip().lower()
    query_words = [w for w in term.split() if w]  # Split into words
    
    if not query_words:
        return []
    
    # Use prefix for initial filtering - check all words' prefixes
    # Collect all possible prefixes from query words
    prefixes = [word[:3] for word in query_words if len(word) >= 3]
    
    # Get candidates that match any of the prefixes
    candidate_indices = set()
    for prefix in prefixes:
        if prefix in _PREFIX_INDEX:
            candidate_indices.update(_PREFIX_INDEX[prefix])
    
    if candidate_indices:
        candidates = frame.loc[list(candidate_indices)]
    else:
        candidates = frame

    # Calculate match scores for each candidate
    scores = []
    for idx, row in candidates.iterrows():
        desc_score = _calculate_match_score(str(row.get("description", "")), query_words)
        brand_score = _calculate_match_score(str(row.get("brand_owner", "")), query_words) * 0.5  # Brand is less important
        category_score = _calculate_match_score(str(row.get("category_description", "")), query_words) * 0.3
        
        total_score = desc_score + brand_score + category_score
        if total_score > 0:
            scores.append((idx, total_score))
    
    # If no matches in prefix-filtered candidates, search entire dataset
    if not scores:
        scores = []
        for idx, row in frame.iterrows():
            desc_score = _calculate_match_score(str(row.get("description", "")), query_words)
            brand_score = _calculate_match_score(str(row.get("brand_owner", "")), query_words) * 0.5
            category_score = _calculate_match_score(str(row.get("category_description", "")), query_words) * 0.3
            
            total_score = desc_score + brand_score + category_score
            if total_score > 0:
                scores.append((idx, total_score))
    
    # Sort by score (descending) and get top results
    scores.sort(key=lambda x: x[1], reverse=True)
    top_indices = [idx for idx, _ in scores[:max(1, limit)]]
    
    if not top_indices:
        return []
    
    filtered = frame.loc[top_indices]
    limited = filtered[_SEARCH_COLUMNS].to_dict("records")

    if include_micronutrients:
        for record in limited:
            record["micronutrients"] = {}

    return limited


def get_usda_gold_macros(fdc_id: int) -> Dict[str, Any]:
    _ensure_dataset()
    record = _LOOKUP_BY_ID.get(int(fdc_id))
    keys = [
        "kcal_per_g",
        "protein_per_g",
        "fat_per_g",
        "carb_per_g",
        "kcal",
        "protein_g",
        "fat_g",
        "carb_g",
        "serving_size",
        "serving_size_unit",
    ]
    if not record:
        return {key: None for key in keys}

    result: Dict[str, Any] = {}
    for key in keys:
        value = record.get(key)
        if key == "serving_size_unit":
            result[key] = value if value not in ("", None) else None
        elif key == "serving_size":
            result[key] = _clean_numeric(value)
        else:
            result[key] = _clean_numeric(value)
    return result


def _extract_brand(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def get_usda_food_detail(fdc_id: int) -> Optional[Dict[str, Any]]:
    frame = _ensure_dataset()
    record = _LOOKUP_BY_ID.get(int(fdc_id))
    
    # If _LOOKUP_BY_ID is empty or record not found, search directly in frame
    if record is None:
        matches = frame[frame["fdc_id"] == int(fdc_id)]
        if matches.empty:
            logger.debug("Food %s not found in dataset", fdc_id)
            return None
        record = matches.iloc[0].to_dict()
        # Cache it for future lookups
        _LOOKUP_BY_ID[int(fdc_id)] = record

    basis = str(record.get("basis") or "per_100g").lower()
    unit_category = "mass" if basis == "per_100g" else "volume"
    per100_unit = "g" if unit_category == "mass" else "ml"
    per100_amount = 100.0

    per100 = {
        "unit": per100_unit,
        "amount": per100_amount,
        "calories": _clean_numeric(record.get("kcal")),
        "protein": _clean_numeric(record.get("protein_g")),
        "carbs": _clean_numeric(record.get("carb_g")),
        "fat": _clean_numeric(record.get("fat_g")),
    }

    per_gram_values = {
        "calories": _clean_numeric(record.get("kcal_per_g")),
        "protein": _clean_numeric(record.get("protein_per_g")),
        "carbs": _clean_numeric(record.get("carb_per_g")),
        "fat": _clean_numeric(record.get("fat_per_g")),
    }
    per_gram = per_gram_values if any(value is not None for value in per_gram_values.values()) else None

    serving_size = _clean_numeric(record.get("serving_size")) or per100_amount
    serving_unit = record.get("serving_size_unit") or per100_unit

    detail = {
        "fdc_id": int(record["fdc_id"]),
        "description": record.get("description"),
        "brand_owner": _extract_brand(record.get("brand_owner")),
        "data_type": record.get("data_type"),
        "gtin_upc": None,
        "serving_size": serving_size,
        "serving_size_unit": serving_unit,
        "ingredients": None,
        "kcal": _clean_numeric(record.get("kcal")),
        "protein_g": _clean_numeric(record.get("protein_g")),
        "fat_g": _clean_numeric(record.get("fat_g")),
        "carb_g": _clean_numeric(record.get("carb_g")),
        "micronutrients": {},
        "per_100": per100,
        "per_gram": per_gram,
        "unit_category": unit_category,
        "kcal_per_g": _clean_numeric(record.get("kcal_per_g")),
        "protein_per_g": _clean_numeric(record.get("protein_per_g")),
        "fat_per_g": _clean_numeric(record.get("fat_per_g")),
        "carb_per_g": _clean_numeric(record.get("carb_per_g")),
    }
    return detail


__all__ = [
    "preload_usda_gold",
    "search_usda_foods",
    "get_usda_food_detail",
    "get_usda_gold_macros",
]

