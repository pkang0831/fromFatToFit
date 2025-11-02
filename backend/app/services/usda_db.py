"""USDA FoodData Central Database Service using DuckDB."""
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

import duckdb
import glob
import polars as pl

logger = logging.getLogger(__name__)

# Singleton connection
_db_connection: Optional[duckdb.DuckDBPyConnection] = None
_db_path = Path(__file__).parent.parent.parent / "usda_foods.duckdb"


def get_usda_db() -> duckdb.DuckDBPyConnection:
    """Get or create the USDA DuckDB connection (singleton pattern)."""
    global _db_connection
    if _db_connection is None:
        _db_connection = _initialize_database()
    return _db_connection


def _initialize_database() -> duckdb.DuckDBPyConnection:
    """Initialize the DuckDB database with schema and data."""
    # Use persistent file-based database
    db_path_str = str(_db_path)
    
    # Check if database is already initialized (has data)
    if _db_path.exists():
        try:
            con = duckdb.connect(database=db_path_str, read_only=False)
            result = con.execute("SELECT COUNT(*) FROM food").fetchone()
            if result and result[0] > 0:
                # Database already has data, just return connection
                logger.info(f"USDA database loaded with {result[0]} foods")
                return con
            else:
                # Database exists but is empty, close and recreate
                con.close()
                _db_path.unlink()
                logger.info("Empty database found, recreating...")
        except Exception as e:
            # Database exists but has errors, delete and recreate
            logger.warning(f"Database error, recreating: {e}")
            if _db_path.exists():
                _db_path.unlink()
    
    # Create fresh database
    con = duckdb.connect(database=db_path_str, read_only=False)
    logger.info("Initializing new USDA database...")
    
    # Initialize schema and load data
    logger.info("📊 Step 1/3: Creating USDA database schema...")
    _create_schema(con)
    logger.info("✅ Schema created")
    
    logger.info("📊 Step 2/3: Loading USDA data from CSV files...")
    logger.info("⏳ This will take 15-30+ minutes (loading 26M+ nutrient records)...")
    logger.info("💡 Loading critical tables first, then the large food_nutrient table...")
    _load_data(con)
    logger.info("✅ Data loading complete")
    
    logger.info("📊 Step 3/3: Creating USDA database views...")
    try:
        _create_views(con)
        logger.info("✅ Views created")
    except Exception as e:
        logger.warning(f"⚠️ Some views may not work without full data: {e}")
        logger.info("💡 You can load food_nutrient later for full nutrition data")
    
    # Verify data was loaded
    try:
        count = con.execute("SELECT COUNT(*) FROM food").fetchone()[0]
        logger.info(f"🎉 USDA database initialized successfully!")
        logger.info(f"📈 Total foods loaded: {count:,}")
    except Exception as e:
        logger.warning(f"Could not verify food count: {e}")
    
    return con


def _create_schema(con: duckdb.DuckDBPyConnection) -> None:
    """Create the database schema."""
    con.execute("""
    CREATE TABLE IF NOT EXISTS food(
      fdc_id BIGINT PRIMARY KEY,
      data_type VARCHAR,
      description VARCHAR,
      food_category_id BIGINT,
      publication_date DATE,
      scientific_name VARCHAR,
      food_key VARCHAR
    );

    CREATE TABLE IF NOT EXISTS food_category(
      id BIGINT PRIMARY KEY,
      code VARCHAR,
      description VARCHAR
    );

    CREATE TABLE IF NOT EXISTS branded_food(
      fdc_id BIGINT PRIMARY KEY REFERENCES food(fdc_id),
      brand_owner VARCHAR,
      gtin_upc VARCHAR,
      ingredients VARCHAR,
      serving_size DOUBLE,
      serving_size_unit VARCHAR,
      household_serving_fulltext VARCHAR,
      branded_food_category VARCHAR,
      data_source VARCHAR,
      modified_date DATE,
      available_date DATE,
      discontinued_date DATE,
      market_country VARCHAR
    );

    CREATE TABLE IF NOT EXISTS nutrient(
      id BIGINT PRIMARY KEY,
      name VARCHAR,
      unit_name VARCHAR,
      nutrient_nbr VARCHAR
    );

    CREATE TABLE IF NOT EXISTS food_nutrient(
      id BIGINT PRIMARY KEY,
      fdc_id BIGINT REFERENCES food(fdc_id),
      nutrient_id BIGINT REFERENCES nutrient(id),
      amount DOUBLE,
      data_points BIGINT,
      derivation_id BIGINT,
      standard_error DOUBLE,
      min DOUBLE,
      max DOUBLE,
      median DOUBLE,
      footnote VARCHAR,
      min_year_acquired INTEGER
    );

    CREATE TABLE IF NOT EXISTS food_nutrient_derivation(
      id BIGINT PRIMARY KEY,
      code VARCHAR,
      description VARCHAR,
      source_id BIGINT
    );

    CREATE TABLE IF NOT EXISTS food_nutrient_source(
      id BIGINT PRIMARY KEY,
      code VARCHAR,
      description VARCHAR
    );

    CREATE TABLE IF NOT EXISTS measure_unit(
      id BIGINT PRIMARY KEY,
      name VARCHAR,
      abbreviation VARCHAR
    );

    CREATE TABLE IF NOT EXISTS food_portion(
      id BIGINT PRIMARY KEY,
      fdc_id BIGINT REFERENCES food(fdc_id),
      seq_num INTEGER,
      amount DOUBLE,
      measure_unit_id BIGINT REFERENCES measure_unit(id),
      portion_description VARCHAR,
      modifier VARCHAR,
      gram_weight DOUBLE,
      data_points BIGINT,
      footnote VARCHAR,
      min_year_acquired INTEGER
    );

    CREATE TABLE IF NOT EXISTS food_attribute_type(
      id BIGINT PRIMARY KEY,
      name VARCHAR,
      description VARCHAR
    );

    CREATE TABLE IF NOT EXISTS food_attribute(
      id BIGINT PRIMARY KEY,
      fdc_id BIGINT REFERENCES food(fdc_id),
      seq_num INTEGER,
      food_attribute_type_id BIGINT REFERENCES food_attribute_type(id),
      name VARCHAR,
      value VARCHAR
    );

    CREATE TABLE IF NOT EXISTS input_food(
      id BIGINT PRIMARY KEY,
      fdc_id BIGINT REFERENCES food(fdc_id),
      fdc_id_of_input_food BIGINT,
      seq_num INTEGER,
      amount DOUBLE,
      unit VARCHAR,
      gram_weight DOUBLE
    );

    CREATE TABLE IF NOT EXISTS food_component(
      id BIGINT PRIMARY KEY,
      fdc_id BIGINT REFERENCES food(fdc_id),
      name VARCHAR,
      pct_weight DOUBLE,
      is_refuse BOOLEAN,
      gram_weight DOUBLE,
      data_points BIGINT,
      min_year_acquired INTEGER
    );

    CREATE TABLE IF NOT EXISTS food_update_log_entry(
      fdc_id BIGINT REFERENCES food(fdc_id),
      description VARCHAR,
      publication_date DATE
    );
    """)


def _register_csv(con: duckdb.DuckDBPyConnection, name_hint: str, pattern: str, data_dir: Path) -> bool:
    """Register Parquet files (preferred) or CSV files with DuckDB."""
    # First try Parquet (much faster - 5-10x than CSV)
    parquet_pattern = pattern.replace(".csv*", ".parquet")
    parquet_dir = data_dir.parent / f"{data_dir.name}_parquet"
    
    if parquet_dir.exists():
        parquet_files = sorted(glob.glob(str(parquet_dir / parquet_pattern)))
        if parquet_files:
            try:
                # DuckDB's native Parquet reader is extremely fast
                if len(parquet_files) == 1:
                    file_path = parquet_files[0].replace("'", "''")  # Escape quotes
                    con.execute(f"CREATE OR REPLACE VIEW {name_hint} AS SELECT * FROM read_parquet('{file_path}')")
                else:
                    # For multiple Parquet files, DuckDB can read them all at once
                    file_list = "', '".join([f.replace("'", "''") for f in parquet_files])
                    con.execute(f"CREATE OR REPLACE VIEW {name_hint} AS SELECT * FROM read_parquet(['{file_list}'])")
                logger.debug(f"✅ Using Parquet for {name_hint} ({len(parquet_files)} files) - FAST!")
                return True
            except Exception as e:
                logger.warning(f"Failed to load Parquet for {name_hint}, trying CSV: {e}")
    
    # Fallback to CSV if Parquet not available
    csv_files = sorted(glob.glob(str(data_dir / pattern)))
    if not csv_files:
        return False
    
    try:
        # Use DuckDB's native CSV reading
        if len(csv_files) == 1:
            file_path = csv_files[0].replace("'", "''")
            con.execute(f"CREATE OR REPLACE VIEW {name_hint} AS SELECT * FROM read_csv_auto('{file_path}', header=true, ignore_errors=true)")
        else:
            union_query = " UNION ALL ".join([f"SELECT * FROM read_csv_auto('{f.replace(chr(39), chr(39)+chr(39))}', header=true, ignore_errors=true)" for f in csv_files])
            con.execute(f"CREATE OR REPLACE VIEW {name_hint} AS {union_query}")
        logger.debug(f"⚠️ Using CSV for {name_hint} ({len(csv_files)} files) - slower, consider converting to Parquet")
        return True
    except Exception as e:
        logger.warning(f"Failed to register {name_hint}: {e}")
        return False


def _load_data(con: duckdb.DuckDBPyConnection) -> None:
    """Load data from CSV files into the database."""
    data_dir = Path(__file__).parent.parent / 'data' / 'FoodData_Central_csv'
    supporting_data_dir = Path(__file__).parent.parent / 'data' / 'FoodData_Central_Supporting_Data_csv'
    
    if not data_dir.exists():
        # No data directory, skip loading
        logger.warning(f"USDA data directory not found: {data_dir}")
        return
    
    logger.info(f"Loading data from: {data_dir}")
    
    # Use INSERT OR IGNORE to handle duplicates and only select columns that exist
    # Priority: Load essential tables first for search functionality
    # Critical tables (needed for search):
    mapping_critical = [
        ("vw_food", "food.csv*",
         "INSERT OR IGNORE INTO food SELECT fdc_id::BIGINT, data_type, description, try_cast(food_category_id as BIGINT), try_cast(publication_date as DATE), NULL::VARCHAR AS scientific_name, NULL::VARCHAR AS food_key FROM vw_food"),
        ("vw_branded_food", "branded_food.csv*",
         "INSERT OR IGNORE INTO branded_food SELECT fdc_id::BIGINT, brand_owner, gtin_upc, ingredients, try_cast(serving_size as DOUBLE), serving_size_unit, household_serving_fulltext, branded_food_category, data_source, try_cast(modified_date as DATE), try_cast(available_date as DATE), try_cast(discontinued_date as DATE), market_country FROM vw_branded_food WHERE fdc_id IN (SELECT fdc_id FROM food)"),
    ]
    
    # Optional tables (can load later or skip for faster startup)
    mapping_optional = [
        ("vw_food_category", "food_category.csv*",
         "INSERT OR IGNORE INTO food_category SELECT DISTINCT id::BIGINT, code, description FROM vw_food_category"),
        ("vw_nutrient", "nutrient.csv*",
         "INSERT OR IGNORE INTO nutrient SELECT DISTINCT id::BIGINT, name, unit_name, nutrient_nbr FROM vw_nutrient"),
        # Load food_nutrient - this is huge (26M rows, 1.6GB) and will take 15-30+ minutes
        # But it's essential for nutrition data (calories, protein, carbs, fat, etc.)
        ("vw_food_nutrient", "food_nutrient.csv*",
         "INSERT OR IGNORE INTO food_nutrient SELECT id::BIGINT, fdc_id::BIGINT, nutrient_id::BIGINT, try_cast(amount as DOUBLE), try_cast(data_points as BIGINT), try_cast(derivation_id as BIGINT), NULL::DOUBLE as standard_error, try_cast(min as DOUBLE), try_cast(max as DOUBLE), try_cast(median as DOUBLE), footnote, try_cast(min_year_acquired as INTEGER) FROM vw_food_nutrient WHERE fdc_id IN (SELECT fdc_id FROM food)"),
        # Handle derivation - source_id might not exist
        ("vw_food_nutrient_derivation", "food_nutrient_derivation.csv*",
         "INSERT OR IGNORE INTO food_nutrient_derivation SELECT DISTINCT id::BIGINT, code, description, NULL::BIGINT as source_id FROM vw_food_nutrient_derivation"),
        ("vw_food_nutrient_source", "food_nutrient_source.csv*",
         "INSERT OR IGNORE INTO food_nutrient_source SELECT DISTINCT id::BIGINT, code, description FROM vw_food_nutrient_source"),
        # Check Supporting Data CSV for measure_unit (try supporting data first, then main)
        ("vw_measure_unit", "measure_unit.csv*",
         "INSERT OR IGNORE INTO measure_unit SELECT DISTINCT id::BIGINT, name, NULL::VARCHAR as abbreviation FROM vw_measure_unit"),
        ("vw_food_portion", "food_portion.csv*",
         "INSERT OR IGNORE INTO food_portion SELECT id::BIGINT, fdc_id::BIGINT, try_cast(seq_num as INTEGER), try_cast(amount as DOUBLE), try_cast(measure_unit_id as BIGINT), portion_description, modifier, try_cast(gram_weight as DOUBLE), try_cast(data_points as BIGINT), footnote, try_cast(min_year_acquired as INTEGER) FROM vw_food_portion WHERE fdc_id IN (SELECT fdc_id FROM food)"),
        ("vw_food_attribute_type", "food_attribute_type.csv*",
         "INSERT OR IGNORE INTO food_attribute_type SELECT DISTINCT id::BIGINT, name, description FROM vw_food_attribute_type"),
        ("vw_food_attribute", "food_attribute.csv*",
         "INSERT OR IGNORE INTO food_attribute SELECT id::BIGINT, fdc_id::BIGINT, try_cast(seq_num as INTEGER), try_cast(food_attribute_type_id as BIGINT), name, value FROM vw_food_attribute WHERE fdc_id IN (SELECT fdc_id FROM food)"),
        ("vw_input_food", "input_food.csv*",
         "INSERT OR IGNORE INTO input_food SELECT id::BIGINT, fdc_id::BIGINT, try_cast(fdc_id_of_input_food as BIGINT), try_cast(seq_num as INTEGER), try_cast(amount as DOUBLE), unit, try_cast(gram_weight as DOUBLE) FROM vw_input_food WHERE fdc_id IN (SELECT fdc_id FROM food)"),
        ("vw_food_component", "food_component.csv*",
         "INSERT OR IGNORE INTO food_component SELECT id::BIGINT, fdc_id::BIGINT, name, try_cast(pct_weight as DOUBLE), (is_refuse='Y')::BOOLEAN, try_cast(gram_weight as DOUBLE), try_cast(data_points as BIGINT), try_cast(min_year_acquired as INTEGER) FROM vw_food_component WHERE fdc_id IN (SELECT fdc_id FROM food)"),
        # food_update_log_entry might have different column structure
        ("vw_food_update_log_entry", "food_update_log_entry.csv*",
         "INSERT OR IGNORE INTO food_update_log_entry SELECT try_cast(fdc_id as BIGINT), description, try_cast(publication_date as DATE) FROM vw_food_update_log_entry WHERE try_cast(fdc_id as BIGINT) IN (SELECT fdc_id FROM food)")
    ]
    
    # Combine critical and optional tables
    mapping = mapping_critical + mapping_optional

    loaded_count = 0
    total_tables = len(mapping)
    
    logger.info(f"📦 Loading {len(mapping_critical)} critical tables first (for search), then {len(mapping_optional)} optional tables...")
    
    for idx, (vw, pattern, sql) in enumerate(mapping, 1):
        # Try main data directory first
        registered = _register_csv(con, vw, pattern, data_dir)
        # If measure_unit not found, try supporting data directory
        if not registered and vw == "vw_measure_unit" and supporting_data_dir.exists():
            registered = _register_csv(con, vw, pattern, supporting_data_dir)
        
        if registered:
            try:
                logger.info(f"[{idx}/{total_tables}] Loading {vw}...")
                con.execute(sql)
                loaded_count += 1
                logger.info(f"✅ {vw} loaded successfully")
            except Exception as e:
                logger.warning(f"❌ Error loading {vw}: {e}")
                # Skip if table already has data or other error
                pass
        else:
            logger.debug(f"CSV file not found for {vw} with pattern {pattern}")
    
    logger.info(f"✅ Loaded data from {loaded_count}/{total_tables} CSV files")


def _create_views(con: duckdb.DuckDBPyConnection) -> None:
    """Create useful views for querying."""
    con.execute("""
    CREATE OR REPLACE VIEW brand_latest AS
    WITH b AS (
      SELECT
        bf.gtin_upc,
        f.fdc_id,
        f.publication_date,
        ROW_NUMBER() OVER (PARTITION BY bf.gtin_upc ORDER BY f.publication_date DESC NULLS LAST) AS rn
      FROM branded_food bf
      JOIN food f ON f.fdc_id = bf.fdc_id
      WHERE bf.gtin_upc IS NOT NULL AND bf.gtin_upc <> ''
    )
    SELECT * FROM b WHERE rn = 1;
    """)

    con.execute("""
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
    FROM food f
    LEFT JOIN food_category fc ON fc.id = f.food_category_id
    LEFT JOIN branded_food bf ON bf.fdc_id = f.fdc_id
    LEFT JOIN brand_latest bl ON bl.fdc_id = f.fdc_id;
    """)

    con.execute("""
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
      fn.standard_error, fn.min, fn.max, fn.median, fn.footnote
    FROM food_nutrient fn
    LEFT JOIN nutrient n ON n.id = fn.nutrient_id
    LEFT JOIN food_nutrient_derivation d ON d.id = fn.derivation_id
    LEFT JOIN food_nutrient_source s ON s.id = d.source_id;
    """)

    # Create nutrient wide pivot view
    common_map = {
        "Energy": "kcal",
        "Protein": "protein_g",
        "Total lipid (fat)": "fat_g",
        "Carbohydrate, by difference": "carb_g",
        "Total dietary fiber": "fiber_g",
        "Total sugars": "sugars_g",
        "Sodium, Na": "sodium_mg"
    }
    cases = []
    for nname, col in common_map.items():
        cases.append(f"MAX(CASE WHEN nutrient_name = '{nname}' THEN amount END) AS {col}")
    pivot_sql = f"""
    CREATE OR REPLACE VIEW food_nutrient_wide AS
    SELECT
      fdc_id,
      {", ".join(cases)}
    FROM fact_food_nutrient
    GROUP BY fdc_id;
    """
    con.execute(pivot_sql)

    con.execute("""
    CREATE OR REPLACE VIEW portion_default AS
    WITH ranked AS (
      SELECT
        fp.*,
        ROW_NUMBER() OVER (PARTITION BY fdc_id ORDER BY COALESCE(seq_num, 999999), id) AS rn
      FROM food_portion fp
    )
    SELECT * FROM ranked WHERE rn = 1;
    """)


def search_usda_foods(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Search USDA foods by name or description."""
    con = get_usda_db()
    
    # First check if database has data
    try:
        food_count = con.execute("SELECT COUNT(*) FROM food").fetchone()[0]
        if food_count == 0:
            logger.warning("USDA database has no foods loaded")
            return []
        logger.debug(f"Searching {food_count} foods for: {query}")
    except Exception as e:
        logger.error(f"Error checking food count: {e}")
        return []
    
    # Escape special characters for SQL LIKE patterns (escape % and _)
    escaped_query = query.replace('%', '\\%').replace('_', '\\_')
    query_pattern = f"%{escaped_query}%"
    query_start = f"{escaped_query}%"
    
    # DuckDB uses $1, $2, etc. for parameters
    sql = """
    SELECT 
      fm.fdc_id,
      fm.description,
      fm.brand_owner,
      fm.gtin_upc,
      fm.serving_size,
      fm.serving_size_unit,
      fnw.kcal,
      fnw.protein_g,
      fnw.fat_g,
      fnw.carb_g
    FROM food_master fm
    LEFT JOIN food_nutrient_wide fnw ON fnw.fdc_id = fm.fdc_id
    WHERE 
      fm.description ILIKE $1
      OR fm.brand_owner ILIKE $1
    ORDER BY 
      CASE WHEN fm.description ILIKE $2 THEN 1 ELSE 2 END,
      fm.description
    LIMIT $3
    """
    
    try:
        result = con.execute(sql, [query_pattern, query_start, limit]).fetchdf()
        records = result.to_dict('records') if not result.empty else []
        logger.debug(f"Found {len(records)} USDA foods matching '{query}'")
        return records
    except Exception as e:
        logger.error(f"Error searching USDA foods: {e}", exc_info=True)
        # Try fallback query without views in case views aren't created
        try:
            sql_simple = """
            SELECT 
              f.fdc_id,
              f.description,
              bf.brand_owner,
              bf.gtin_upc,
              bf.serving_size,
              bf.serving_size_unit,
              NULL as kcal,
              NULL as protein_g,
              NULL as fat_g,
              NULL as carb_g
            FROM food f
            LEFT JOIN branded_food bf ON bf.fdc_id = f.fdc_id
            WHERE f.description ILIKE $1
            LIMIT $2
            """
            result = con.execute(sql_simple, [query_pattern, limit]).fetchdf()
            return result.to_dict('records') if not result.empty else []
        except Exception as e2:
            logger.error(f"Fallback query also failed: {e2}")
            return []

