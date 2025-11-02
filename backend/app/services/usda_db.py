"""USDA FoodData Central Database Service using DuckDB."""
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

import duckdb

logger = logging.getLogger(__name__)

# Singleton connection
_db_connection: Optional[duckdb.DuckDBPyConnection] = None
_db_path = Path(__file__).parent.parent.parent / "usda_foods.duckdb"
_MICRONUTRIENT_CATALOG: Optional[List[Dict[str, str]]] = None
_GOLD_TABLE_PATH = Path(__file__).parent.parent / "data" / "medallion" / "gold" / "food_search.parquet"
_gold_con: Optional[duckdb.DuckDBPyConnection] = None


def get_usda_db() -> duckdb.DuckDBPyConnection:
    """Get or create the USDA DuckDB connection (singleton pattern)."""
    global _db_connection
    if _db_connection is None:
        _db_connection = _initialize_database()
    return _db_connection


def _initialize_database() -> duckdb.DuckDBPyConnection:
    """Initialize the DuckDB database and expose Parquet-backed views."""
    con = duckdb.connect(database=str(_db_path), read_only=False)
    logger.info("Preparing USDA DuckDB views from Parquet files...")

    try:
        _create_parquet_views(con)
        _create_views(con)
        logger.info("✅ USDA Parquet views are ready")
    except Exception as exc:
        logger.warning("⚠️ Failed to build one or more USDA views: %s", exc)

    try:
        count = con.execute("SELECT COUNT(*) FROM food_parquet").fetchone()[0]
        logger.info(f"📈 USDA dataset available via Parquet views: {count:,} foods")
    except Exception as exc:
        logger.warning("Could not verify food count via Parquet views: %s", exc)

    return con


def _ensure_micronutrient_catalog(con: duckdb.DuckDBPyConnection) -> List[Dict[str, str]]:
    """Load and cache the list of distinct nutrient names/units."""
    global _MICRONUTRIENT_CATALOG
    if _MICRONUTRIENT_CATALOG is None:
        rows = con.execute(
            """
            SELECT DISTINCT nutrient_name, unit_name
            FROM fact_food_nutrient
            ORDER BY nutrient_name
            """
        ).fetchall()
        _MICRONUTRIENT_CATALOG = [
            {"name": name, "unit": unit}
            for name, unit in rows
        ]
        logger.info("Loaded %d micronutrients into catalog", len(_MICRONUTRIENT_CATALOG))
    return _MICRONUTRIENT_CATALOG


def _load_gold_table() -> duckdb.DuckDBPyConnection:
    global _gold_con
    if _gold_con is not None:
        return _gold_con

    if not _GOLD_TABLE_PATH.exists():
        raise FileNotFoundError(
            f"USDA gold table not found at {_GOLD_TABLE_PATH}. Run build_usda_medallion.py first."
        )

    con = duckdb.connect()
    escaped = str(_GOLD_TABLE_PATH).replace("'", "''")
    con.execute(
        f"""
        CREATE OR REPLACE VIEW food_search_gold AS
        SELECT * FROM read_parquet('{escaped}')
        """
    )
    _gold_con = con
    return con


def _create_parquet_views(con: duckdb.DuckDBPyConnection) -> None:
    """Expose key FoodData Central tables as DuckDB views backed by Parquet files."""
    data_dir = Path(__file__).parent.parent / "data" / "FoodData_Central_csv"
    parquet_dir = data_dir.parent / f"{data_dir.name}_parquet"

    if not parquet_dir.exists():
        logger.warning("Parquet directory not found for USDA data: %s", parquet_dir)
        return

    view_configs = {
        "food_parquet": {
            "file": "food.parquet",
            "select": """
                SELECT
                  try_cast(fdc_id as BIGINT) AS fdc_id,
                  data_type,
                  description,
                  try_cast(food_category_id as BIGINT) AS food_category_id,
                  try_cast(publication_date as DATE) AS publication_date,
                  NULL::VARCHAR AS scientific_name,
                  NULL::VARCHAR AS food_key
                FROM read_parquet('{path}')
            """,
        },
        "branded_food_parquet": {
            "file": "branded_food.parquet",
            "select": """
                SELECT
                  try_cast(fdc_id as BIGINT) AS fdc_id,
                  brand_owner,
                  CAST(gtin_upc AS VARCHAR) AS gtin_upc,
                  ingredients,
                  try_cast(serving_size as DOUBLE) AS serving_size,
                  serving_size_unit,
                  household_serving_fulltext,
                  branded_food_category,
                  data_source,
                  try_cast(modified_date as DATE) AS modified_date,
                  try_cast(available_date as DATE) AS available_date,
                  try_cast(discontinued_date as DATE) AS discontinued_date,
                  market_country
                FROM read_parquet('{path}')
            """,
        },
        "food_category_parquet": {
            "file": "food_category.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  code,
                  description
                FROM read_parquet('{path}')
            """,
        },
        "nutrient_parquet": {
            "file": "nutrient.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  name,
                  unit_name,
                  nutrient_nbr
                FROM read_parquet('{path}')
            """,
        },
        "food_nutrient_parquet": {
            "file": "food_nutrient.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  try_cast(fdc_id as BIGINT) AS fdc_id,
                  try_cast(nutrient_id as BIGINT) AS nutrient_id,
                  try_cast(amount as DOUBLE) AS amount,
                  try_cast(data_points as BIGINT) AS data_points,
                  try_cast(derivation_id as BIGINT) AS derivation_id,
                  NULL::DOUBLE AS standard_error,
                  try_cast(min as DOUBLE) AS min,
                  try_cast(max as DOUBLE) AS max,
                  try_cast(median as DOUBLE) AS median,
                  footnote,
                  try_cast(min_year_acquired as INTEGER) AS min_year_acquired
                FROM read_parquet('{path}')
            """,
        },
        "food_nutrient_derivation_parquet": {
            "file": "food_nutrient_derivation.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  code,
                  description,
                  NULL::BIGINT AS source_id
                FROM read_parquet('{path}')
            """,
        },
        "food_nutrient_source_parquet": {
            "file": "food_nutrient_source.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  code,
                  description
                FROM read_parquet('{path}')
            """,
        },
        "measure_unit_parquet": {
            "file": "measure_unit.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  name,
                  NULL::VARCHAR AS abbreviation
                FROM read_parquet('{path}')
            """,
        },
        "food_portion_parquet": {
            "file": "food_portion.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  try_cast(fdc_id as BIGINT) AS fdc_id,
                  try_cast(seq_num as INTEGER) AS seq_num,
                  try_cast(amount as DOUBLE) AS amount,
                  try_cast(measure_unit_id as BIGINT) AS measure_unit_id,
                  portion_description,
                  modifier,
                  try_cast(gram_weight as DOUBLE) AS gram_weight,
                  try_cast(data_points as BIGINT) AS data_points,
                  footnote,
                  try_cast(min_year_acquired as INTEGER) AS min_year_acquired
                FROM read_parquet('{path}')
            """,
        },
        "food_attribute_type_parquet": {
            "file": "food_attribute_type.parquet",
        },
        "food_attribute_parquet": {
            "file": "food_attribute.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  try_cast(fdc_id as BIGINT) AS fdc_id,
                  try_cast(seq_num as INTEGER) AS seq_num,
                  try_cast(food_attribute_type_id as BIGINT) AS food_attribute_type_id,
                  name,
                  value
                FROM read_parquet('{path}')
            """,
        },
        "food_component_parquet": {
            "file": "food_component.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  try_cast(fdc_id as BIGINT) AS fdc_id,
                  name,
                  try_cast(pct_weight as DOUBLE) AS pct_weight,
                  (is_refuse = 'Y')::BOOLEAN AS is_refuse,
                  try_cast(gram_weight as DOUBLE) AS gram_weight,
                  try_cast(data_points as BIGINT) AS data_points,
                  try_cast(min_year_acquired as INTEGER) AS min_year_acquired
                FROM read_parquet('{path}')
            """,
        },
        "input_food_parquet": {
            "file": "input_food.parquet",
            "select": """
                SELECT
                  try_cast(id as BIGINT) AS id,
                  try_cast(fdc_id as BIGINT) AS fdc_id,
                  try_cast(fdc_id_of_input_food as BIGINT) AS fdc_id_of_input_food,
                  try_cast(seq_num as INTEGER) AS seq_num,
                  try_cast(amount as DOUBLE) AS amount,
                  unit,
                  try_cast(gram_weight as DOUBLE) AS gram_weight
                FROM read_parquet('{path}')
            """,
        },
    }

    created_views: List[str] = []
    missing_views: List[str] = []

    for view_name, config in view_configs.items():
        file_path = parquet_dir / config["file"]
        if not file_path.exists():
            missing_views.append(view_name)
            logger.warning("Parquet file missing for %s: %s", view_name, file_path)
            continue

        path_literal = str(file_path).replace("'", "''")
        select_sql = config.get("select")
        if select_sql:
            select_statement = select_sql.format(path=path_literal)
        else:
            select_statement = f"SELECT * FROM read_parquet('{path_literal}')"

        con.execute(f"CREATE OR REPLACE VIEW {view_name} AS {select_statement}")
        created_views.append(view_name)

    if created_views:
        logger.info("📦 USDA Parquet views created: %s", ", ".join(created_views))
    if missing_views:
        logger.warning("⚠️ Skipped Parquet views (file not found): %s", ", ".join(missing_views))


def _create_views(con: duckdb.DuckDBPyConnection) -> None:
    """Create high-level views that the API queries."""

    con.execute(
        """
        CREATE OR REPLACE VIEW brand_latest AS
        WITH ranked AS (
          SELECT
            bf.gtin_upc,
            f.fdc_id,
            f.publication_date,
            ROW_NUMBER() OVER (
              PARTITION BY bf.gtin_upc
              ORDER BY f.publication_date DESC NULLS LAST
            ) AS rn
          FROM branded_food_parquet bf
          JOIN food_parquet f ON f.fdc_id = bf.fdc_id
          WHERE bf.gtin_upc IS NOT NULL AND bf.gtin_upc <> ''
        )
        SELECT * FROM ranked WHERE rn = 1;
        """
    )

    con.execute(
        """
        CREATE OR REPLACE VIEW food_master AS
        SELECT
          f.fdc_id,
          f.data_type,
          f.description,
          f.scientific_name,
          f.food_category_id,
          fc.description AS food_category_desc,
          f.publication_date,
          bf.brand_owner,
          bf.gtin_upc,
          bf.ingredients,
          bf.serving_size,
          bf.serving_size_unit,
          bf.household_serving_fulltext,
          bf.branded_food_category,
          bf.available_date,
          bf.discontinued_date,
          bf.market_country,
          CASE WHEN bl.fdc_id IS NOT NULL THEN 1 ELSE 0 END AS is_latest_for_gtin
        FROM food_parquet f
        LEFT JOIN food_category_parquet fc ON fc.id = f.food_category_id
        LEFT JOIN branded_food_parquet bf ON bf.fdc_id = f.fdc_id
        LEFT JOIN brand_latest bl ON bl.fdc_id = f.fdc_id;
        """
    )

    con.execute(
        """
        CREATE OR REPLACE VIEW fact_food_nutrient AS
        SELECT
          fn.fdc_id,
          fn.nutrient_id,
          n.name AS nutrient_name,
          n.unit_name,
          fn.amount,
          fn.data_points,
          d.code AS derivation_code,
          d.description AS derivation_desc,
          s.code AS source_code,
          s.description AS source_desc,
          fn.standard_error,
          fn.min,
          fn.max,
          fn.median,
          fn.footnote
        FROM food_nutrient_parquet fn
        LEFT JOIN nutrient_parquet n ON n.id = fn.nutrient_id
        LEFT JOIN food_nutrient_derivation_parquet d ON d.id = fn.derivation_id
        LEFT JOIN food_nutrient_source_parquet s ON s.id = d.source_id;
        """
    )

    common_map = {
        "Energy": "kcal",
        "Protein": "protein_g",
        "Total lipid (fat)": "fat_g",
        "Carbohydrate, by difference": "carb_g",
        "Total dietary fiber": "fiber_g",
        "Total sugars": "sugars_g",
        "Sodium, Na": "sodium_mg",
    }
    cases = [
        f"MAX(CASE WHEN nutrient_name = '{name}' THEN amount END) AS {alias}"
        for name, alias in common_map.items()
    ]

    con.execute(
        f"""
        CREATE OR REPLACE VIEW food_nutrient_wide AS
        SELECT
          fdc_id,
          {", ".join(cases)}
        FROM (
          SELECT
            fnp.fdc_id,
            n.name AS nutrient_name,
            fnp.amount
          FROM food_nutrient_parquet fnp
          LEFT JOIN nutrient_parquet n ON n.id = fnp.nutrient_id
        )
        GROUP BY fdc_id;
        """
    )

    con.execute(
        """
        CREATE OR REPLACE VIEW portion_default AS
        WITH ranked AS (
          SELECT
            fp.*,
            ROW_NUMBER() OVER (
              PARTITION BY fdc_id
              ORDER BY COALESCE(seq_num, 999_999), id
            ) AS rn
          FROM food_portion_parquet fp
        )
        SELECT
          r.fdc_id,
          r.amount,
          r.measure_unit_id,
          mu.name AS measure_unit_name,
          r.portion_description,
          r.gram_weight
        FROM ranked r
        LEFT JOIN measure_unit_parquet mu ON mu.id = r.measure_unit_id
        WHERE rn = 1;
        """
    )


def search_usda_foods(query: str, limit: int = 10, *, include_micronutrients: bool = False) -> List[Dict[str, Any]]:
    """Search USDA foods by name or description.

    When ``include_micronutrients`` is True, the full micronutrient catalog is attached;
    otherwise results contain only macros (faster for autocomplete).
    """
    con = get_usda_db()
    global _MICRONUTRIENT_CATALOG

    # Ensure Parquet views are available
    try:
        food_count = con.execute("SELECT COUNT(*) FROM food_parquet").fetchone()[0]
        logger.debug("Using Parquet view for food search (%s foods)", food_count)
    except Exception as exc:
        logger.error("USDA Parquet views are not available: %s", exc)
        return []

    if food_count == 0:
        logger.warning("USDA database has no foods loaded")
        return []
    logger.debug("Searching %s foods for: %s", food_count, query)

    normalized_query = query.strip()
    if len(normalized_query) < 1:
        return []

    gold_con = _load_gold_table()

    lower_term = normalized_query.lower()
    records: List[Dict[str, Any]] = []
    seen: set[int] = set()
    remaining = limit

    def fetch(sql: str, pattern: str) -> None:
        nonlocal remaining
        if remaining <= 0:
            return
        try:
            df = gold_con.execute(sql, [pattern, remaining]).fetchdf()
        except Exception as err:
            logger.error("Error searching USDA foods: %s", err, exc_info=True)
            return
        if df.empty:
            return
        for row in df.to_dict("records"):
            fdc_id = row["fdc_id"]
            if fdc_id in seen:
                continue
            records.append(row)
            seen.add(fdc_id)
            remaining -= 1
            if remaining <= 0:
                break

    prefix_pattern = f"{lower_term}%"
    word_boundary_pattern = f"% {lower_term}%"
    contains_pattern = f"%{lower_term}%"

    base_select = (
        "SELECT \
            fdc_id, description, brand_owner, serving_size, serving_size_unit, \
            kcal, protein_g, fat_g, carb_g, \
            LOWER(description) AS description_lower, \
            LOWER(brand_owner) AS brand_lower \
         FROM food_search_gold"
    )

    fetch(
        base_select + " WHERE description_lower LIKE $1 ORDER BY description LIMIT $2",
        prefix_pattern,
    )
    fetch(
        base_select + " WHERE description_lower LIKE $1 ORDER BY description LIMIT $2",
        word_boundary_pattern,
    )
    fetch(
        base_select + " WHERE brand_lower LIKE $1 ORDER BY brand_owner LIMIT $2",
        prefix_pattern,
    )
    if remaining > 0:
        fetch(
            base_select + " WHERE description_lower LIKE $1 ORDER BY description LIMIT $2",
            contains_pattern,
        )

    if not records:
        return []

    if include_micronutrients:
        catalog = _ensure_micronutrient_catalog(con)
        fdc_ids = [row["fdc_id"] for row in records]
        for row in records:
            row["micronutrients"] = {
                entry["name"]: {
                    "amount": 0.0,
                    "unit": entry["unit"],
                    "label": entry["name"],
                }
                for entry in catalog
            }

        if fdc_ids and catalog:
            params: List[Any] = []
            fdc_tokens = []
            for fdc_id in fdc_ids:
                params.append(fdc_id)
                fdc_tokens.append(f"${len(params)}")

            nutrient_tokens = []
            for entry in catalog:
                params.append(entry["name"])
                nutrient_tokens.append(f"${len(params)}")

            nutrient_sql = f"""
                SELECT
                  fdc_id,
                  nutrient_name,
                  amount,
                  unit_name
                FROM fact_food_nutrient
                WHERE fdc_id IN ({', '.join(fdc_tokens)})
                  AND nutrient_name IN ({', '.join(nutrient_tokens)})
            """

            try:
                nutrient_rows = con.execute(nutrient_sql, params).fetchall()
            except Exception as exc:
                logger.warning("Could not fetch micronutrient data: %s", exc)
                nutrient_rows = []

            if nutrient_rows:
                record_index = {row["fdc_id"]: row for row in records}
                for fdc_id, nutrient_name, amount, unit_name in nutrient_rows:
                    record = record_index.get(fdc_id)
                    if not record:
                        continue
                    record["micronutrients"][nutrient_name]["amount"] = (
                        float(amount) if amount is not None else 0.0
                    )

    return records


def get_usda_food_detail(fdc_id: int) -> Optional[Dict[str, Any]]:
    """Fetch detailed USDA nutrition info (macros + micronutrients) for one food."""
    con = get_usda_db()

    detail_df = con.execute(
        """
        SELECT
          fm.fdc_id,
          fm.description,
          fm.brand_owner,
          fm.data_type,
          fm.gtin_upc,
          fm.serving_size,
          fm.serving_size_unit,
          fm.ingredients,
          fnw.kcal,
          fnw.protein_g,
          fnw.fat_g,
          fnw.carb_g
        FROM food_master fm
        LEFT JOIN food_nutrient_wide fnw ON fnw.fdc_id = fm.fdc_id
        WHERE fm.fdc_id = $1
        LIMIT 1
        """,
        [fdc_id],
    ).fetchdf()

    if detail_df.empty:
        return None

    row = detail_df.iloc[0]

    catalog = _ensure_micronutrient_catalog(con)
    micronutrients = {
        entry["name"]: {
            "amount": 0.0,
            "unit": entry["unit"],
            "label": entry["name"],
        }
        for entry in catalog
    }

    params: List[Any] = [fdc_id]
    nutrient_tokens = []
    for entry in catalog:
        params.append(entry["name"])
        nutrient_tokens.append(f"${len(params)}")

    if nutrient_tokens:
        nutrient_sql = f"""
            SELECT
              nutrient_name,
              amount,
              unit_name
            FROM fact_food_nutrient
            WHERE fdc_id = $1
              AND nutrient_name IN ({', '.join(nutrient_tokens)})
        """
        try:
            nutrient_rows = con.execute(nutrient_sql, params).fetchall()
        except Exception as exc:
            logger.warning("Could not fetch micronutrient data for %s: %s", fdc_id, exc)
            nutrient_rows = []

        for nutrient_name, amount, unit_name in nutrient_rows:
            if nutrient_name in micronutrients:
                micronutrients[nutrient_name]["amount"] = (
                    float(amount) if amount is not None else 0.0
                )
                if unit_name:
                    micronutrients[nutrient_name]["unit"] = unit_name

    return {
        "fdc_id": int(row["fdc_id"]),
        "description": row.get("description"),
        "brand_owner": row.get("brand_owner"),
        "data_type": row.get("data_type"),
        "gtin_upc": row.get("gtin_upc"),
        "serving_size": row.get("serving_size"),
        "serving_size_unit": row.get("serving_size_unit"),
        "ingredients": row.get("ingredients"),
        "kcal": row.get("kcal"),
        "protein_g": row.get("protein_g"),
        "fat_g": row.get("fat_g"),
        "carb_g": row.get("carb_g"),
        "micronutrients": micronutrients,
    }

