from __future__ import annotations

import logging
import math
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

_DATASET_CANDIDATES = [
    Path(__file__).resolve().parents[3] / "fooddb_parquet" / "food_data.parquet",
    Path(__file__).resolve().parents[2] / "data" / "medallion" / "gold" / "food_search.parquet",
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
    if _DATAFRAME is not None:
        return _DATAFRAME

    with _LOCK:
        if _DATAFRAME is not None:
            return _DATAFRAME

        dataset_path = _find_dataset_path()
        logger.info("Loading food dataset from %s", dataset_path)
        raw = pd.read_parquet(dataset_path)
        frame = _prepare_dataframe(raw)

        _DATAFRAME = frame
        _PREFIX_INDEX = {prefix: index for prefix, index in frame.groupby("prefix").indices.items()}
        _LOOKUP_BY_ID = {}
        for record in frame.to_dict("records"):
            fdc_id = record.get("fdc_id")
            if isinstance(fdc_id, (int, float)) and not math.isnan(fdc_id):
                record["fdc_id"] = int(fdc_id)
                _LOOKUP_BY_ID[int(fdc_id)] = record

        _READY.set()
        logger.info("Loaded %d foods (unique prefixes=%d)", len(frame), len(_PREFIX_INDEX))
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


def search_usda_foods(query: str, limit: int = 10, include_micronutrients: bool = False) -> List[Dict[str, Any]]:
    if not query or not query.strip():
        return []

    frame = _ensure_dataset()
    term = query.strip().lower()
    prefix = term[:3]

    if prefix in _PREFIX_INDEX:
        candidates = frame.loc[_PREFIX_INDEX[prefix]]
    else:
        candidates = frame

    mask = (
        candidates["description_lower"].str.contains(term, na=False)
        | candidates["brand_lower"].str.contains(term, na=False)
        | candidates["category_description"].str.contains(term, na=False)
    )
    filtered = candidates.loc[mask]

    if filtered.empty:
        filtered = frame.loc[frame["description_lower"].str.contains(term, na=False)]

    filtered = filtered.sort_values(["description_lower", "brand_lower", "fdc_id"])
    limited = filtered[_SEARCH_COLUMNS].head(max(1, limit)).to_dict("records")

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
    if record is None:
        logger.debug("Food %s not found in dataset", fdc_id)
        return None

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

