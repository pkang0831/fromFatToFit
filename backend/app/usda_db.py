import os
from pathlib import Path
# duckdb_polars_fdc_schema.py
import duckdb, polars as pl
import glob

# -------- Paths --------
data_dir = os.path.join(Path(__file__).parent, 'data/FoodData_Central_csv')

FDC_DIR = Path(data_dir)  # <- FDC CSV 압축 해제 디렉토리로 변경
con = duckdb.connect(database=":memory:")

# -------- Helper: register all CSVs as DuckDB views via Polars scan --------
def register_csv(name_hint, pattern):
    files = sorted(glob.glob(str(FDC_DIR / pattern)))
    if not files:
        return False
    lf = pl.scan_csv(files, ignore_errors=True)
    con.register(name_hint, lf)
    return True

# -------- DDL: Core tables (mirror FDC logical schema) --------
con.execute("""
CREATE TABLE food(
  fdc_id BIGINT PRIMARY KEY,
  data_type VARCHAR,        -- foundation_food, branded_food, survey_fndds_food, sr_legacy_food …
  description VARCHAR,
  food_category_id BIGINT,
  publication_date DATE,
  scientific_name VARCHAR,  -- may be NULL if not in CSV
  food_key VARCHAR          -- may be NULL if not in CSV
);

CREATE TABLE food_category(
  id BIGINT PRIMARY KEY,
  code VARCHAR,
  description VARCHAR
);

CREATE TABLE branded_food(
  fdc_id BIGINT PRIMARY KEY REFERENCES food(fdc_id),
  brand_owner VARCHAR,
  gtin_upc VARCHAR,             -- may repeat across time (updates)
  ingredients VARCHAR,
  serving_size DOUBLE,
  serving_size_unit VARCHAR,     -- 'gram' or 'ml'
  household_serving_fulltext VARCHAR,
  branded_food_category VARCHAR,
  data_source VARCHAR,
  modified_date DATE,
  available_date DATE,
  discontinued_date DATE,
  market_country VARCHAR
);

CREATE TABLE nutrient(
  id BIGINT PRIMARY KEY,
  name VARCHAR,
  unit_name VARCHAR,
  nutrient_nbr VARCHAR
);

CREATE TABLE food_nutrient(
  id BIGINT PRIMARY KEY,
  fdc_id BIGINT REFERENCES food(fdc_id),
  nutrient_id BIGINT REFERENCES nutrient(id),
  amount DOUBLE,                 -- per 100 g
  data_points BIGINT,
  derivation_id BIGINT,
  standard_error DOUBLE,
  min DOUBLE,
  max DOUBLE,
  median DOUBLE,
  footnote VARCHAR,
  min_year_acquired INTEGER
);

CREATE TABLE food_nutrient_derivation(
  id BIGINT PRIMARY KEY,
  code VARCHAR,
  description VARCHAR,
  source_id BIGINT
);

CREATE TABLE food_nutrient_source(
  id BIGINT PRIMARY KEY,
  code VARCHAR,
  description VARCHAR
);

CREATE TABLE measure_unit(
  id BIGINT PRIMARY KEY,
  name VARCHAR,
  abbreviation VARCHAR
);

CREATE TABLE food_portion(
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

CREATE TABLE food_attribute_type(
  id BIGINT PRIMARY KEY,
  name VARCHAR,
  description VARCHAR
);

CREATE TABLE food_attribute(
  id BIGINT PRIMARY KEY,
  fdc_id BIGINT REFERENCES food(fdc_id),
  seq_num INTEGER,
  food_attribute_type_id BIGINT REFERENCES food_attribute_type(id),
  name VARCHAR,
  value VARCHAR
);

CREATE TABLE input_food(
  id BIGINT PRIMARY KEY,
  fdc_id BIGINT REFERENCES food(fdc_id),           -- parent (recipe)
  fdc_id_of_input_food BIGINT,                                       -- child ingredient fdc_id (FK optional; some survey rows)
  seq_num INTEGER,
  amount DOUBLE,
  unit VARCHAR,
  gram_weight DOUBLE
);

CREATE TABLE food_component(
  id BIGINT PRIMARY KEY,
  fdc_id BIGINT REFERENCES food(fdc_id),
  name VARCHAR,
  pct_weight DOUBLE,
  is_refuse BOOLEAN,
  gram_weight DOUBLE,
  data_points BIGINT,
  min_year_acquired INTEGER
);

CREATE TABLE food_update_log_entry(
  fdc_id BIGINT REFERENCES food(fdc_id),
  description VARCHAR,
  publication_date DATE
);
""")

# -------- Load CSVs if present (register & INSERT SELECT) --------
# Adjust patterns to your file names; below are common defaults from FDC dumps.
mapping = [
    ("vw_food", "food.csv*",
     "INSERT INTO food SELECT fdc_id::BIGINT, data_type, description, food_category_id::BIGINT, try_cast(publication_date as DATE), NULL::VARCHAR AS scientific_name, NULL::VARCHAR AS food_key FROM vw_food"),
    ("vw_food_category", "food_category.csv*",
     "INSERT INTO food_category SELECT id::BIGINT, code, description FROM vw_food_category"),
    ("vw_branded_food", "branded_food.csv*",
     "INSERT INTO branded_food SELECT fdc_id::BIGINT, brand_owner, gtin_upc, ingredients, try_cast(serving_size as DOUBLE), serving_size_unit, household_serving_fulltext, branded_food_category, data_source, try_cast(modified_date as DATE), try_cast(available_date as DATE), try_cast(discontinued_date as DATE), market_country FROM vw_branded_food"),
    ("vw_nutrient", "nutrient.csv*",
     "INSERT INTO nutrient SELECT id::BIGINT, name, unit_name, nutrient_nbr FROM vw_nutrient"),
    ("vw_food_nutrient", "food_nutrient.csv*",
     "INSERT INTO food_nutrient SELECT id::BIGINT, fdc_id::BIGINT, nutrient_id::BIGINT, try_cast(amount as DOUBLE), try_cast(data_points as BIGINT), try_cast(derivation_id as BIGINT), try_cast(standard_error as DOUBLE), try_cast(min as DOUBLE), try_cast(max as DOUBLE), try_cast(median as DOUBLE), footnote, try_cast(min_year_acquired as INTEGER) FROM vw_food_nutrient"),
    ("vw_food_nutrient_derivation", "food_nutrient_derivation.csv*",
     "INSERT INTO food_nutrient_derivation SELECT id::BIGINT, code, description, try_cast(source_id as BIGINT) FROM vw_food_nutrient_derivation"),
    ("vw_food_nutrient_source", "food_nutrient_source.csv*",
     "INSERT INTO food_nutrient_source SELECT id::BIGINT, code, description FROM vw_food_nutrient_source"),
    ("vw_measure_unit", "measure_unit.csv*",
     "INSERT INTO measure_unit SELECT id::BIGINT, name, abbreviation FROM vw_measure_unit"),
    ("vw_food_portion", "food_portion.csv*",
     "INSERT INTO food_portion SELECT id::BIGINT, fdc_id::BIGINT, try_cast(seq_num as INTEGER), try_cast(amount as DOUBLE), try_cast(measure_unit_id as BIGINT), portion_description, modifier, try_cast(gram_weight as DOUBLE), try_cast(data_points as BIGINT), footnote, try_cast(min_year_acquired as INTEGER) FROM vw_food_portion"),
    ("vw_food_attribute_type", "food_attribute_type.csv*",
     "INSERT INTO food_attribute_type SELECT id::BIGINT, name, description FROM vw_food_attribute_type"),
    ("vw_food_attribute", "food_attribute.csv*",
     "INSERT INTO food_attribute SELECT id::BIGINT, fdc_id::BIGINT, try_cast(seq_num as INTEGER), try_cast(food_attribute_type_id as BIGINT), name, value FROM vw_food_attribute"),
    ("vw_input_food", "input_food.csv*",
     "INSERT INTO input_food SELECT id::BIGINT, fdc_id::BIGINT, try_cast(fdc_id_of_input_food as BIGINT), try_cast(seq_num as INTEGER), try_cast(amount as DOUBLE), unit, try_cast(gram_weight as DOUBLE) FROM vw_input_food"),
    ("vw_food_component", "food_component.csv*",
     "INSERT INTO food_component SELECT id::BIGINT, fdc_id::BIGINT, name, try_cast(pct_weight as DOUBLE), (is_refuse='Y')::BOOLEAN, try_cast(gram_weight as DOUBLE), try_cast(data_points as BIGINT), try_cast(min_year_acquired as INTEGER) FROM vw_food_component"),
    ("vw_food_update_log_entry", "food_update_log_entry.csv*",
     "INSERT INTO food_update_log_entry SELECT fdc_id::BIGINT, description, try_cast(publication_date as DATE) FROM vw_food_update_log_entry")
]

for vw, pattern, sql in mapping:
    if register_csv(vw, pattern):
        con.execute(sql)

# -------- Views: brand_latest (latest by gtin_upc) --------
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

# -------- Master: food_master --------
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

# -------- Fact view: food_nutrient with derivation/source labels --------
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

# -------- Convenience: nutrient wide pivot for common fields --------
# map nutrient names to desired columns (adjust as needed)
common_map = {
    "Energy": "kcal",
    "Protein": "protein_g",
    "Total lipid (fat)": "fat_g",
    "Carbohydrate, by difference": "carb_g",
    "Total dietary fiber": "fiber_g",
    "Total sugars": "sugars_g",
    "Sodium, Na": "sodium_mg"
}
# Build a dynamic SELECT…MAX(CASE…) view
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

# -------- Portion default (heuristic) --------
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

# Quick sanity checks (no output if tables empty)
print(con.execute("SELECT COUNT(*) AS foods FROM food").fetchdf())
print(con.execute("SELECT COUNT(*) AS facts FROM food_nutrient").fetchdf())
print(con.execute("SELECT * FROM food_master LIMIT 5").fetchdf())
print(con.execute("SELECT * FROM food_nutrient_wide LIMIT 5").fetchdf())