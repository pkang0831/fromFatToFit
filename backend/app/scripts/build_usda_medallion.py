#!/usr/bin/env python3
"""USDA Medallion Pipeline

This standalone script materialises the USDA FoodData Central dataset into a
Bronze/Silver/Gold medallion layout that the application can query quickly.

Usage
-----
python app/scripts/build_usda_medallion.py \
    --source app/data/FoodData_Central_csv \
    --output app/data/medallion \
    --rebuild

The pipeline performs the following steps:
1. Bronze  – convert the raw CSVs into columnar Parquet files.
2. Silver  – enrich and aggregate key tables (e.g. macros) into analytic tables.
3. Gold    – produce a deduplicated search table optimised for autocomplete.
"""

from __future__ import annotations

import argparse
import logging
import shutil
import sys
import time
from pathlib import Path

import duckdb


LOGGER = logging.getLogger("usda_medallion")


def ensure_dir(path: Path, rebuild: bool) -> None:
    if rebuild and path.exists():
        LOGGER.info("Removing existing directory: %s", path)
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def escape(path: Path) -> str:
    return str(path).replace("'", "''")


def stage_bronze(con: duckdb.DuckDBPyConnection, source_dir: Path, bronze_dir: Path, rebuild: bool) -> None:
    LOGGER.info("[Bronze] Converting CSVs under %s", source_dir)
    ensure_dir(bronze_dir, rebuild)

    csv_files = sorted(source_dir.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {source_dir}")

    for csv_path in csv_files:
        parquet_path = bronze_dir / f"{csv_path.stem}.parquet"
        if parquet_path.exists() and not rebuild:
            continue
        start = time.time()
        LOGGER.info("  -> %s → %s", csv_path.name, parquet_path.name)
        csv_escaped = escape(csv_path)
        parquet_escaped = escape(parquet_path)
        con.execute(
            f"""
            COPY (
              SELECT *
              FROM read_csv_auto('{csv_escaped}', ALL_VARCHAR=FALSE, IGNORE_ERRORS=TRUE)
            )
            TO '{parquet_escaped}' (FORMAT PARQUET);
            """
        )
        LOGGER.info("     completed in %.1fs", time.time() - start)


def stage_silver(con: duckdb.DuckDBPyConnection, bronze_dir: Path, silver_dir: Path, rebuild: bool) -> None:
    LOGGER.info("[Silver] Building enriched tables")
    ensure_dir(silver_dir, rebuild)

    food_path = escape(bronze_dir / "food.parquet")
    branded_path = escape(bronze_dir / "branded_food.parquet")
    category_path = escape(bronze_dir / "food_category.parquet")
    nutrient_path = escape(bronze_dir / "food_nutrient.parquet")
    nutrient_dim_path = escape(bronze_dir / "nutrient.parquet")

    LOGGER.info("  -> silver_food")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE silver_food AS
        SELECT
          fdc_id,
          data_type,
          description,
          food_category_id,
          publication_date
        FROM read_parquet('{food_path}');
        """
    )

    LOGGER.info("  -> silver_branded_food")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE silver_branded_food AS
        SELECT
          fdc_id,
          brand_owner,
          gtin_upc,
          ingredients,
          serving_size,
          serving_size_unit,
          household_serving_fulltext,
          branded_food_category
        FROM read_parquet('{branded_path}');
        """
    )

    LOGGER.info("  -> silver_food_category")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE silver_food_category AS
        SELECT
          try_cast(id AS BIGINT) AS id,
          description AS category_description
        FROM read_parquet('{category_path}');
        """
    )

    LOGGER.info("  -> silver_macros (aggregating nutrients)")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE silver_macros AS
        WITH base AS (
          SELECT
            try_cast(fn.fdc_id AS BIGINT) AS fdc_id,
            try_cast(fn.nutrient_id AS BIGINT) AS nutrient_id,
            try_cast(fn.amount AS DOUBLE) AS amount
          FROM read_parquet('{nutrient_path}') fn
        ), nutrient_clean AS (
          SELECT
            try_cast(id AS BIGINT) AS id,
            LOWER(name) AS name
          FROM read_parquet('{nutrient_dim_path}')
        )
        SELECT
          b.fdc_id,
          SUM(CASE WHEN nc.name = 'energy' THEN b.amount END) AS kcal,
          SUM(CASE WHEN nc.name = 'protein' THEN b.amount END) AS protein_g,
          SUM(CASE WHEN nc.name = 'total lipid (fat)' THEN b.amount END) AS fat_g,
          SUM(CASE WHEN nc.name = 'carbohydrate, by difference' THEN b.amount END) AS carb_g
        FROM base b
        JOIN nutrient_clean nc ON nc.id = b.nutrient_id
        GROUP BY b.fdc_id;
        """
    )

    LOGGER.info("  -> silver_food_enriched")
    con.execute(
        """
        CREATE OR REPLACE TABLE silver_food_enriched AS
        SELECT
          f.fdc_id,
          f.data_type,
          f.description,
          try_cast(f.food_category_id AS BIGINT) AS food_category_id,
          cat.category_description,
          f.publication_date,
          bf.brand_owner,
          bf.gtin_upc,
          bf.ingredients,
          bf.serving_size,
          bf.serving_size_unit,
          bf.household_serving_fulltext,
          bf.branded_food_category,
          mac.kcal,
          mac.protein_g,
          mac.fat_g,
          mac.carb_g
        FROM silver_food f
        LEFT JOIN silver_food_category cat ON cat.id = try_cast(f.food_category_id AS BIGINT)
        LEFT JOIN silver_branded_food bf ON bf.fdc_id = f.fdc_id
        LEFT JOIN silver_macros mac ON mac.fdc_id = f.fdc_id;
        """
    )

    LOGGER.info("  -> Exporting silver_food_enriched to Parquet")
    enriched_parquet = escape(silver_dir / "food_enriched.parquet")
    con.execute(
        f"""
        COPY silver_food_enriched
        TO '{enriched_parquet}'
        (FORMAT PARQUET, COMPRESSION ZSTD);
        """
    )

    LOGGER.info("  -> Exporting silver_macros to Parquet")
    macros_parquet = escape(silver_dir / "macros.parquet")
    con.execute(
        f"""
        COPY silver_macros
        TO '{macros_parquet}'
        (FORMAT PARQUET, COMPRESSION ZSTD);
        """
    )


def stage_gold(con: duckdb.DuckDBPyConnection, silver_dir: Path, gold_dir: Path, rebuild: bool) -> None:
    LOGGER.info("[Gold] Building deduplicated search table")
    ensure_dir(gold_dir, rebuild)

    enriched_path = escape(silver_dir / "food_enriched.parquet")

    LOGGER.info("  -> gold_food_search")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE gold_food_search AS
        WITH ranked AS (
          SELECT
            sfe.*,
            ROW_NUMBER() OVER (
              PARTITION BY
                LOWER(COALESCE(sfe.description, '')),
                LOWER(COALESCE(sfe.brand_owner, '')),
                COALESCE(sfe.serving_size, -1),
                COALESCE(sfe.serving_size_unit, '')
              ORDER BY
                sfe.publication_date DESC NULLS LAST,
                sfe.fdc_id DESC
            ) AS rn
          FROM read_parquet('{enriched_path}') sfe
        )
        SELECT
          fdc_id,
          description,
          brand_owner,
          category_description,
          serving_size,
          serving_size_unit,
          kcal,
          protein_g,
          fat_g,
          carb_g,
          publication_date,
          data_type,
          gtin_upc,
          ingredients,
          household_serving_fulltext,
          branded_food_category
        FROM ranked
        WHERE rn = 1;
        """
    )

    gold_parquet = escape(gold_dir / "food_search.parquet")
    con.execute(
        f"""
        COPY gold_food_search
        TO '{gold_parquet}'
        (FORMAT PARQUET, COMPRESSION ZSTD);
        """
    )
    LOGGER.info("✅ Gold table saved to %s", gold_parquet)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build USDA medallion dataset")
    parser.add_argument(
        "--source",
        default="app/data/FoodData_Central_csv",
        type=Path,
        help="Directory containing the raw USDA CSV files",
    )
    parser.add_argument(
        "--output",
        default="app/data/medallion",
        type=Path,
        help="Directory where bronze/silver/gold outputs will be stored",
    )
    parser.add_argument(
        "--database",
        default="app/data/medallion/usda_medallion.duckdb",
        type=Path,
        help="DuckDB file used for intermediate transformations",
    )
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Force regeneration of all stages (overwrites existing files)",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    args = parse_args(argv)

    source_dir = args.source.resolve()
    output_dir = args.output.resolve()
    bronze_dir = output_dir / "bronze"
    silver_dir = output_dir / "silver"
    gold_dir = output_dir / "gold"
    db_path = args.database.resolve()

    LOGGER.info("Starting USDA medallion pipeline")
    LOGGER.info("Source CSV directory: %s", source_dir)
    LOGGER.info("Output root: %s", output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.rebuild and db_path.exists():
        LOGGER.info("Removing existing DuckDB database: %s", db_path)
        db_path.unlink()

    con = duckdb.connect(str(db_path))

    start = time.time()
    stage_bronze(con, source_dir, bronze_dir, args.rebuild)
    stage_silver(con, bronze_dir, silver_dir, args.rebuild)
    stage_gold(con, silver_dir, gold_dir, args.rebuild)
    LOGGER.info("Pipeline finished in %.1f seconds", time.time() - start)


if __name__ == "__main__":
    main(sys.argv[1:])
