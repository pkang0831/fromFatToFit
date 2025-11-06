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
1. Bronze  – convert the raw CSVs into canonical Parquet files.
2. Silver  – condense the USDA entity graph into four analytics-friendly tables
             (`food_core`, `food_attributes`, `food_nutrients`, `food_portions`).
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
        parquet_files = sorted(source_dir.glob("*.parquet"))
        if parquet_files:
            LOGGER.info("  -> No CSV detected; copying Parquet files into bronze staging")
            for parquet_path in parquet_files:
                target_path = bronze_dir / parquet_path.name
                if target_path.exists() and not rebuild:
                    continue
                LOGGER.info("     copying %s", parquet_path.name)
                shutil.copy2(parquet_path, target_path)
            return
        raise FileNotFoundError(f"No CSV or Parquet files found in {source_dir}")

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
    foundation_path = escape(bronze_dir / "foundation_food.parquet")
    sr_legacy_path = escape(bronze_dir / "sr_legacy_food.parquet")
    category_path = escape(bronze_dir / "food_category.parquet")
    wweia_category_path = escape(bronze_dir / "wweia_food_category.parquet")
    survey_path = escape(bronze_dir / "survey_fndds_food.parquet")
    agricultural_path = escape(bronze_dir / "agricultural_samples.parquet")
    market_path = escape(bronze_dir / "market_acquisition.parquet")
    food_attribute_path = escape(bronze_dir / "food_attribute.parquet")
    food_attribute_type_path = escape(bronze_dir / "food_attribute_type.parquet")
    food_update_log_path = escape(bronze_dir / "food_update_log_entry.parquet")
    microbe_path = escape(bronze_dir / "microbe.parquet")
    food_nutrient_path = escape(bronze_dir / "food_nutrient.parquet")
    nutrient_dim_path = escape(bronze_dir / "nutrient.parquet")
    food_nutrient_derivation_path = escape(bronze_dir / "food_nutrient_derivation.parquet")
    sub_sample_path = escape(bronze_dir / "sub_sample_result.parquet")
    lab_method_path = escape(bronze_dir / "lab_method.parquet")
    lab_method_code_path = escape(bronze_dir / "lab_method_code.parquet")
    food_portion_path = escape(bronze_dir / "food_portion.parquet")
    measure_unit_path = escape(bronze_dir / "measure_unit.parquet")
    food_component_path = escape(bronze_dir / "food_component.parquet")
    input_food_path = escape(bronze_dir / "input_food.parquet")
    retention_factor_path = escape(bronze_dir / "retention_factor.parquet")
    conversion_factor_path = escape(bronze_dir / "food_nutrient_conversion_factor.parquet")
    calorie_factor_path = escape(bronze_dir / "food_calorie_conversion_factor.parquet")
    protein_factor_path = escape(bronze_dir / "food_protein_conversion_factor.parquet")

    LOGGER.info("  -> silver_food_core")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE silver_food_core AS
        WITH food_base AS (
          SELECT
            try_cast(fdc_id AS BIGINT) AS fdc_id,
            data_type,
            description,
            try_cast(NULLIF(food_category_id, '') AS BIGINT) AS food_category_id,
            publication_date
          FROM read_parquet('{food_path}')
        ),
        category_dim AS (
          SELECT
            try_cast(id AS BIGINT) AS id,
            description AS category_description
          FROM read_parquet('{category_path}')
        ),
        branded AS (
          SELECT
            try_cast(fdc_id AS BIGINT) AS fdc_id,
            struct_pack(
              brand_owner := brand_owner,
              brand_name := brand_name,
              subbrand_name := subbrand_name,
              gtin_upc := CAST(gtin_upc AS VARCHAR),
              data_source := data_source,
              package_weight := package_weight,
              serving_size := try_cast(serving_size AS DOUBLE),
              serving_size_unit := serving_size_unit,
              household_serving_fulltext := household_serving_fulltext,
              branded_food_category := branded_food_category,
              market_country := market_country,
              available_date := available_date,
              discontinued_date := discontinued_date,
              preparation_state_code := preparation_state_code,
              trade_channel := trade_channel,
              short_description := short_description,
              material_code := material_code,
              ingredients := ingredients,
              not_a_significant_source_of := not_a_significant_source_of
            ) AS branded_detail
          FROM read_parquet('{branded_path}')
        ),
        foundation AS (
          SELECT
            try_cast(fdc_id AS BIGINT) AS fdc_id,
            struct_pack(
              ndb_number := try_cast(NDB_number AS BIGINT),
              footnote := footnote
            ) AS foundation_detail
          FROM read_parquet('{foundation_path}')
        ),
        sr_legacy AS (
          SELECT
            try_cast(fdc_id AS BIGINT) AS fdc_id,
            struct_pack(
              ndb_number := try_cast(NDB_number AS BIGINT)
            ) AS sr_legacy_detail
          FROM read_parquet('{sr_legacy_path}')
        ),
        wweia AS (
          SELECT
            try_cast(wweia_food_category AS BIGINT) AS wweia_food_category,
            wweia_food_category_description
          FROM read_parquet('{wweia_category_path}')
        ),
        survey AS (
          SELECT
            try_cast(s.fdc_id AS BIGINT) AS fdc_id,
            LIST(
              struct_pack(
                food_code := try_cast(s.food_code AS BIGINT),
                wweia_category_code := try_cast(s.wweia_category_code AS BIGINT),
                wweia_category_description := w.wweia_food_category_description,
                start_date := s.start_date,
                end_date := s.end_date
              )
            ) AS survey_items
          FROM read_parquet('{survey_path}') s
          LEFT JOIN wweia w ON w.wweia_food_category = try_cast(s.wweia_category_code AS BIGINT)
          WHERE s.fdc_id IS NOT NULL
          GROUP BY s.fdc_id
        ),
        agricultural AS (
          SELECT
            try_cast(fdc_id AS BIGINT) AS fdc_id,
            LIST(
              struct_pack(
                acquisition_date := acquisition_date,
                market_class := market_class,
                treatment := treatment,
                state := state
              )
            ) AS agricultural_samples
          FROM read_parquet('{agricultural_path}')
          WHERE fdc_id IS NOT NULL
          GROUP BY fdc_id
        ),
        market AS (
          SELECT
            try_cast(fdc_id AS BIGINT) AS fdc_id,
            LIST(
              struct_pack(
                brand_description := brand_description,
                acquisition_date := acquisition_date,
                expiration_date := expiration_date,
                label_weight := label_weight,
                location := location,
                sales_type := sales_type,
                sample_lot_nbr := sample_lot_nbr,
                sell_by_date := sell_by_date,
                store_city := store_city,
                store_name := store_name,
                store_state := store_state,
                upc_code := upc_code
              )
            ) AS market_acquisitions
          FROM read_parquet('{market_path}')
          WHERE fdc_id IS NOT NULL
          GROUP BY fdc_id
        )
        SELECT
          fb.fdc_id,
          fb.data_type,
          fb.description,
          struct_pack(
            id := fb.food_category_id,
            description := cat.category_description
          ) AS category,
          fb.publication_date,
          branded.branded_detail,
          foundation.foundation_detail,
          sr_legacy.sr_legacy_detail,
          survey.survey_items,
          agricultural.agricultural_samples,
          market.market_acquisitions
        FROM food_base fb
        LEFT JOIN category_dim cat ON cat.id = fb.food_category_id
        LEFT JOIN branded ON branded.fdc_id = fb.fdc_id
        LEFT JOIN foundation ON foundation.fdc_id = fb.fdc_id
        LEFT JOIN sr_legacy ON sr_legacy.fdc_id = fb.fdc_id
        LEFT JOIN survey ON survey.fdc_id = fb.fdc_id
        LEFT JOIN agricultural ON agricultural.fdc_id = fb.fdc_id
        LEFT JOIN market ON market.fdc_id = fb.fdc_id;
        """
    )

    LOGGER.info("  -> silver_food_attributes")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE silver_food_attributes AS
        WITH attribute_types AS (
          SELECT
            try_cast(id AS BIGINT) AS id,
            name,
            description
          FROM read_parquet('{food_attribute_type_path}')
        ),
        update_logs AS (
          SELECT
            try_cast(id AS BIGINT) AS id,
            description,
            last_updated
          FROM read_parquet('{food_update_log_path}')
        ),
        attributes AS (
          SELECT
            try_cast(fa.fdc_id AS BIGINT) AS fdc_id,
            LIST(
              struct_pack(
                attribute_id := try_cast(fa.id AS BIGINT),
                seq_num := try_cast(NULLIF(fa.seq_num, '') AS BIGINT),
                name := fa.name,
                value := NULLIF(TRIM(CAST(fa.value AS VARCHAR)), ''),
                type := struct_pack(
                  id := try_cast(NULLIF(fa.food_attribute_type_id, '') AS BIGINT),
                  name := attr_type.name,
                  description := attr_type.description
                ),
                update_log := CASE
                  WHEN attr_type.name = 'Update Log' THEN struct_pack(
                    log_id := CASE
                      WHEN regexp_full_match(TRIM(CAST(fa.value AS VARCHAR)), '^[0-9]+$')
                      THEN CAST(TRIM(CAST(fa.value AS VARCHAR)) AS BIGINT)
                    END,
                    description := ul.description,
                    last_updated := ul.last_updated
                  )
                END
              )
            ) AS attributes
          FROM read_parquet('{food_attribute_path}') fa
          LEFT JOIN attribute_types attr_type ON attr_type.id = try_cast(NULLIF(fa.food_attribute_type_id, '') AS BIGINT)
          LEFT JOIN update_logs ul ON ul.id = CASE
            WHEN regexp_full_match(TRIM(CAST(fa.value AS VARCHAR)), '^[0-9]+$')
            THEN CAST(TRIM(CAST(fa.value AS VARCHAR)) AS BIGINT)
          END
          WHERE fa.fdc_id IS NOT NULL
          GROUP BY fa.fdc_id
        ),
        microbes AS (
          SELECT
            try_cast(foodId AS BIGINT) AS fdc_id,
            LIST(
              struct_pack(
                microbe_id := try_cast(id AS BIGINT),
                method := method,
                microbe_code := microbe_code,
                min_value := try_cast(min_value AS DOUBLE),
                max_value := max_value,
                uom := uom
              )
            ) AS microbiological_tests
          FROM read_parquet('{microbe_path}')
          WHERE foodId IS NOT NULL
          GROUP BY foodId
        )
        SELECT
          COALESCE(attr.fdc_id, micro.fdc_id) AS fdc_id,
          attr.attributes,
          micro.microbiological_tests
        FROM attributes attr
        FULL OUTER JOIN microbes micro ON micro.fdc_id = attr.fdc_id;
        """
    )

    LOGGER.info("  -> silver_food_nutrients")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE silver_food_nutrients AS
        WITH nutrient_dim AS (
          SELECT
            try_cast(id AS BIGINT) AS id,
            struct_pack(
              name := name,
              unit_name := unit_name,
              nutrient_nbr := try_cast(nutrient_nbr AS DOUBLE),
              rank := rank
            ) AS nutrient_info
          FROM read_parquet('{nutrient_dim_path}')
        ),
        derivation_dim AS (
          SELECT
            try_cast(id AS BIGINT) AS id,
            struct_pack(
              code := code,
              description := description
            ) AS derivation_info
          FROM read_parquet('{food_nutrient_derivation_path}')
        ),
        lab_method_codes AS (
          SELECT
            try_cast(lab_method_id AS BIGINT) AS lab_method_id,
            LIST(code) AS codes
          FROM read_parquet('{lab_method_code_path}')
          WHERE lab_method_id IS NOT NULL
          GROUP BY lab_method_id
        ),
        lab_methods AS (
          SELECT
            try_cast(id AS BIGINT) AS id,
            description,
            technique,
            lmc.codes
          FROM read_parquet('{lab_method_path}') lm
          LEFT JOIN lab_method_codes lmc ON lmc.lab_method_id = try_cast(lm.id AS BIGINT)
        ),
        sub_samples AS (
          SELECT
            try_cast(ss.food_nutrient_id AS BIGINT) AS food_nutrient_id,
            LIST(
              struct_pack(
                lab_method_id := try_cast(ss.lab_method_id AS BIGINT),
                nutrient_name := ss.nutrient_name,
                adjusted_amount := ss.adjusted_amount,
                lab_method := struct_pack(
                  description := lm.description,
                  technique := lm.technique,
                  codes := lm.codes
                )
              )
            ) AS lab_measurements
          FROM read_parquet('{sub_sample_path}') ss
          LEFT JOIN lab_methods lm ON lm.id = try_cast(ss.lab_method_id AS BIGINT)
          WHERE ss.food_nutrient_id IS NOT NULL
          GROUP BY ss.food_nutrient_id
        ),
        base AS (
          SELECT
            try_cast(id AS BIGINT) AS food_nutrient_id,
            try_cast(fdc_id AS BIGINT) AS fdc_id,
            try_cast(nutrient_id AS BIGINT) AS nutrient_id,
            try_cast(amount AS DOUBLE) AS amount,
            data_points,
            try_cast(derivation_id AS BIGINT) AS derivation_id,
            min,
            max,
            median,
            loq,
            footnote,
            min_year_acquired,
            percent_daily_value
          FROM read_parquet('{food_nutrient_path}')
        )
        SELECT
          base.food_nutrient_id,
          base.fdc_id,
          base.nutrient_id,
          base.amount,
          base.data_points,
          base.min,
          base.max,
          base.median,
          base.loq,
          base.footnote,
          base.min_year_acquired,
          base.percent_daily_value,
          nutrient_dim.nutrient_info,
          derivation_dim.derivation_info,
          sub_samples.lab_measurements
        FROM base
        LEFT JOIN nutrient_dim ON nutrient_dim.id = base.nutrient_id
        LEFT JOIN derivation_dim ON derivation_dim.id = base.derivation_id
        LEFT JOIN sub_samples ON sub_samples.food_nutrient_id = base.food_nutrient_id;
        """
    )

    LOGGER.info("  -> silver_food_portions")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE silver_food_portions AS
        WITH measure_units AS (
          SELECT
            try_cast(id AS BIGINT) AS id,
            name
          FROM read_parquet('{measure_unit_path}')
        ),
        portions AS (
          SELECT
            try_cast(fp.fdc_id AS BIGINT) AS fdc_id,
            LIST(
              struct_pack(
                portion_id := try_cast(fp.id AS BIGINT),
                seq_num := try_cast(fp.seq_num AS BIGINT),
                amount := try_cast(fp.amount AS DOUBLE),
                measure := struct_pack(
                  id := try_cast(fp.measure_unit_id AS BIGINT),
                  name := mu.name
                ),
                portion_description := fp.portion_description,
                modifier := fp.modifier,
                gram_weight := try_cast(fp.gram_weight AS DOUBLE),
                data_points := fp.data_points,
                footnote := fp.footnote,
                min_year_acquired := fp.min_year_acquired
              )
            ) AS portions
          FROM read_parquet('{food_portion_path}') fp
          LEFT JOIN measure_units mu ON mu.id = try_cast(fp.measure_unit_id AS BIGINT)
          WHERE fp.fdc_id IS NOT NULL
          GROUP BY fp.fdc_id
        ),
        components AS (
          SELECT
            try_cast(fc.fdc_id AS BIGINT) AS fdc_id,
            LIST(
              struct_pack(
                component_id := try_cast(fc.id AS BIGINT),
                name := fc.name,
                pct_weight := fc.pct_weight,
                is_refuse := fc.is_refuse,
                gram_weight := try_cast(fc.gram_weight AS DOUBLE),
                data_points := try_cast(fc.data_points AS BIGINT),
                min_year_acquired := fc.min_year_acquired
              )
            ) AS components
          FROM read_parquet('{food_component_path}') fc
          WHERE fc.fdc_id IS NOT NULL
          GROUP BY fc.fdc_id
        ),
        retention_dim AS (
          SELECT
            try_cast("n.code" AS BIGINT) AS retention_code,
            struct_pack(
              gid := try_cast("n.gid" AS BIGINT),
              food_group_id := try_cast("n.foodGroupId" AS BIGINT),
              description := "n.description"
            ) AS retention_info
          FROM read_parquet('{retention_factor_path}')
        ),
        input_foods AS (
          SELECT
            try_cast(ifd.fdc_id AS BIGINT) AS fdc_id,
            LIST(
              struct_pack(
                input_food_id := try_cast(ifd.id AS BIGINT),
                seq_num := try_cast(ifd.seq_num AS BIGINT),
                amount := try_cast(ifd.amount AS DOUBLE),
                sr_code := try_cast(ifd.sr_code AS BIGINT),
                sr_description := ifd.sr_description,
                unit := ifd.unit,
                portion_code := try_cast(ifd.portion_code AS BIGINT),
                portion_description := ifd.portion_description,
                gram_weight := try_cast(ifd.gram_weight AS DOUBLE),
                retention_code := try_cast(ifd.retention_code AS BIGINT),
                retention := retention_dim.retention_info
              )
            ) AS input_foods
          FROM read_parquet('{input_food_path}') ifd
          LEFT JOIN retention_dim ON retention_dim.retention_code = try_cast(ifd.retention_code AS BIGINT)
          WHERE ifd.fdc_id IS NOT NULL
          GROUP BY ifd.fdc_id
        ),
        calorie_factors AS (
          SELECT
            try_cast(food_nutrient_conversion_factor_id AS BIGINT) AS conversion_factor_id,
            struct_pack(
              protein_value := try_cast(protein_value AS DOUBLE),
              fat_value := try_cast(fat_value AS DOUBLE),
              carbohydrate_value := try_cast(carbohydrate_value AS DOUBLE)
            ) AS calorie_values
          FROM read_parquet('{calorie_factor_path}')
        ),
        protein_factors AS (
          SELECT
            try_cast(food_nutrient_conversion_factor_id AS BIGINT) AS conversion_factor_id,
            try_cast(value AS DOUBLE) AS protein_value
          FROM read_parquet('{protein_factor_path}')
        ),
        conversion_base AS (
          SELECT
            try_cast(id AS BIGINT) AS conversion_factor_id,
            try_cast(fdc_id AS BIGINT) AS fdc_id
          FROM read_parquet('{conversion_factor_path}')
        ),
        conversion_agg AS (
          SELECT
            cb.fdc_id,
            LIST(
              struct_pack(
                conversion_factor_id := cb.conversion_factor_id,
                calorie_factors := cf.calorie_values,
                protein_factor := pf.protein_value
              )
            ) AS conversion_factors
          FROM conversion_base cb
          LEFT JOIN calorie_factors cf ON cf.conversion_factor_id = cb.conversion_factor_id
          LEFT JOIN protein_factors pf ON pf.conversion_factor_id = cb.conversion_factor_id
          WHERE cb.fdc_id IS NOT NULL
          GROUP BY cb.fdc_id
        ),
        fdc_index AS (
          SELECT DISTINCT fdc_id FROM portions
          UNION
          SELECT DISTINCT fdc_id FROM components
          UNION
          SELECT DISTINCT fdc_id FROM input_foods
          UNION
          SELECT DISTINCT fdc_id FROM conversion_agg
        )
        SELECT
          fk.fdc_id,
          portions.portions,
          components.components,
          input_foods.input_foods,
          conversion_agg.conversion_factors
        FROM fdc_index fk
        LEFT JOIN portions ON portions.fdc_id = fk.fdc_id
        LEFT JOIN components ON components.fdc_id = fk.fdc_id
        LEFT JOIN input_foods ON input_foods.fdc_id = fk.fdc_id
        LEFT JOIN conversion_agg ON conversion_agg.fdc_id = fk.fdc_id;
        """
    )

    LOGGER.info("  -> Exporting silver_food_core to Parquet")
    food_core_path = escape(silver_dir / "food_core.parquet")
    con.execute(
        f"""
        COPY silver_food_core
        TO '{food_core_path}'
        (FORMAT PARQUET, COMPRESSION ZSTD);
        """
    )

    LOGGER.info("  -> Exporting silver_food_attributes to Parquet")
    food_attributes_path = escape(silver_dir / "food_attributes.parquet")
    con.execute(
        f"""
        COPY silver_food_attributes
        TO '{food_attributes_path}'
        (FORMAT PARQUET, COMPRESSION ZSTD);
        """
    )

    LOGGER.info("  -> Exporting silver_food_nutrients to Parquet")
    food_nutrients_path = escape(silver_dir / "food_nutrients.parquet")
    con.execute(
        f"""
        COPY silver_food_nutrients
        TO '{food_nutrients_path}'
        (FORMAT PARQUET, COMPRESSION ZSTD);
        """
    )

    LOGGER.info("  -> Exporting silver_food_portions to Parquet")
    food_portions_path = escape(silver_dir / "food_portions.parquet")
    con.execute(
        f"""
        COPY silver_food_portions
        TO '{food_portions_path}'
        (FORMAT PARQUET, COMPRESSION ZSTD);
        """
    )


def stage_gold(con: duckdb.DuckDBPyConnection, silver_dir: Path, gold_dir: Path, rebuild: bool) -> None:
    LOGGER.info("[Gold] Building deduplicated search table")
    ensure_dir(gold_dir, rebuild)

    core_path = escape(silver_dir / "food_core.parquet")
    nutrient_path = escape(silver_dir / "food_nutrients.parquet")

    LOGGER.info("  -> gold_food_search")
    con.execute(
        f"""
        CREATE OR REPLACE TABLE gold_food_search AS
        WITH catalog AS (
          SELECT * FROM read_parquet('{core_path}')
        ),
        nutrients_base AS (
          SELECT
            fdc_id,
            SUM(CASE WHEN nutrient_id = 1008 THEN amount END) AS kcal_raw,
            SUM(CASE WHEN nutrient_id = 1003 THEN amount END) AS protein_g,
            SUM(CASE WHEN nutrient_id = 1004 THEN amount END) AS fat_g,
            SUM(CASE WHEN nutrient_id = 1005 THEN amount END) AS carb_g
          FROM read_parquet('{nutrient_path}')
          GROUP BY fdc_id
        ),
        nutrients AS (
          SELECT
            fdc_id,
            protein_g,
            fat_g,
            carb_g,
            CASE
              WHEN kcal_raw IS NOT NULL THEN kcal_raw
              WHEN protein_g IS NOT NULL OR fat_g IS NOT NULL OR carb_g IS NOT NULL THEN
                (4 * COALESCE(protein_g, 0)) + (9 * COALESCE(fat_g, 0)) + (4 * COALESCE(carb_g, 0))
              ELSE NULL
            END AS kcal
          FROM nutrients_base
        ),
        flattened AS (
          SELECT
            c.fdc_id,
            c.description,
            c.data_type,
            c.publication_date,
            c.category.description AS category_description,
            c.branded_detail.brand_owner AS brand_owner,
            c.branded_detail.gtin_upc AS gtin_upc,
            c.branded_detail.ingredients AS ingredients,
            c.branded_detail.serving_size AS serving_size,
            c.branded_detail.serving_size_unit AS serving_size_unit,
            c.branded_detail.household_serving_fulltext AS household_serving_fulltext,
            c.branded_detail.branded_food_category AS branded_food_category,
            nutrients.kcal,
            nutrients.protein_g,
            nutrients.fat_g,
            nutrients.carb_g
          FROM catalog c
          LEFT JOIN nutrients ON nutrients.fdc_id = c.fdc_id
        ),
        ranked AS (
          SELECT
            flattened.*,
            ROW_NUMBER() OVER (
              PARTITION BY
                LOWER(COALESCE(flattened.description, '')),
                LOWER(COALESCE(flattened.brand_owner, '')),
                COALESCE(flattened.serving_size, -1),
                COALESCE(flattened.serving_size_unit, '')
              ORDER BY
                flattened.publication_date DESC NULLS LAST,
                flattened.fdc_id DESC
            ) AS rn
          FROM flattened
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
