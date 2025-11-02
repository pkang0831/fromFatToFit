#!/usr/bin/env python3
"""Quick CLI to exercise the USDA search without running the API server."""

import argparse
import json
import sys
from pathlib import Path
from typing import Any


# Ensure the backend package is importable when this script is run directly.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


from app.services.usda_db import search_usda_foods  # noqa: E402


def _serialize(obj: Any) -> Any:
    if isinstance(obj, float):
        return obj
    return obj


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run a USDA food search via DuckDB without starting FastAPI.")
    parser.add_argument("query", help="Search term, e.g. 'oyster' or 'beef'.")
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of foods to return (default: 5).")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print raw JSON instead of the human-friendly format.")

    args = parser.parse_args()

    results = search_usda_foods(args.query, args.limit)

    if args.json:
        print(json.dumps(results, indent=2))
        return

    if not results:
        print("No foods found for query:", args.query)
        return

    for idx, item in enumerate(results, start=1):
        print(f"[{idx}] {item['description']} (fdc_id={item['fdc_id']})")
        brand_owner = item.get("brand_owner")
        if brand_owner:
            print(f"    Brand: {brand_owner}")
        if item.get("serving_size"):
            print(
                f"    Serving: {item['serving_size']} {item.get('serving_size_unit', '')}".rstrip()
            )
        print(
            f"    Macros: kcal={item.get('kcal')}, protein_g={item.get('protein_g')}, "
            f"fat_g={item.get('fat_g')}, carb_g={item.get('carb_g')}"
        )

        micronutrients = item.get("micronutrients") or {}
        if micronutrients:
            print("    Micronutrients:")
            for key, data in sorted(micronutrients.items()):
                amount = data.get("amount")
                unit = data.get("unit")
                label = data.get("label", key)
                print(f"      - {label}: {amount} {unit}")
        print()


if __name__ == "__main__":
    main()


