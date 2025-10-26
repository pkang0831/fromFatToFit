from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import pathlib
import sys
import uuid
from typing import Iterable, Iterator, Optional

from sqlalchemy import select

from .. import models
from ..database import SessionLocal


def load_records(path: pathlib.Path) -> Iterator[dict]:
    if path.suffix.lower() == ".json":
        with path.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)
        if isinstance(payload, list):
            for entry in payload:
                if isinstance(entry, dict):
                    yield entry
        return

    if path.suffix.lower() in {".csv", ".tsv"}:
        delimiter = "\t" if path.suffix.lower() == ".tsv" else ","
        with path.open("r", encoding="utf-8") as fh:
            reader = csv.DictReader(fh, delimiter=delimiter)
            for row in reader:
                yield row
        return

    raise ValueError(f"Unsupported file format: {path.suffix}")


def normalize(value: object) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return str(value)


def to_float(value: object) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def import_foods(records: Iterable[dict], user_id: Optional[int]) -> tuple[int, int]:
    created = updated = 0
    with SessionLocal() as session:
        if user_id is not None:
            user = session.execute(select(models.User).where(models.User.id == user_id)).scalar_one_or_none()
            if user is None:
                raise RuntimeError(f"User with ID {user_id} does not exist")

        for record in records:
            name = normalize(record.get("name"))
            if not name:
                continue

            brand = normalize(record.get("brand_name"))
            serving = normalize(record.get("serving_description"))
            calories = to_float(record.get("calories"))
            protein = to_float(record.get("protein"))
            carbs = to_float(record.get("carbs"))
            fat = to_float(record.get("fat"))

            query = (
                session.query(models.FoodItem)
                .filter(
                    models.FoodItem.provider == "local",
                    models.FoodItem.name.ilike(name),
                    models.FoodItem.brand_name == brand,
                    models.FoodItem.serving_description == serving,
                )
            )
            if user_id is None:
                query = query.filter(models.FoodItem.created_by_user_id.is_(None))
            else:
                query = query.filter(models.FoodItem.created_by_user_id == user_id)
            existing = query.first()

            if existing:
                existing.calories = calories
                existing.protein = protein
                existing.carbs = carbs
                existing.fat = fat
                existing.last_refreshed = dt.datetime.utcnow()
                updated += 1
                continue

            item = models.FoodItem(
                provider="local",
                provider_food_id=str(uuid.uuid4()),
                name=name,
                brand_name=brand,
                serving_description=serving,
                calories=calories,
                protein=protein,
                carbs=carbs,
                fat=fat,
                created_by_user_id=user_id,
                last_refreshed=dt.datetime.utcnow(),
            )
            session.add(item)
            created += 1

        session.commit()

    return created, updated


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Import local food items into the database")
    parser.add_argument("path", type=pathlib.Path, help="Path to a JSON or CSV file")
    parser.add_argument(
        "--user-id",
        type=int,
        default=None,
        help="Associate the imported foods with a specific user ID",
    )
    args = parser.parse_args(argv)

    try:
        records = list(load_records(args.path))
    except Exception as exc:  # noqa: BLE001
        parser.error(str(exc))
        return 1

    if not records:
        print("No records found", file=sys.stderr)
        return 1

    created, updated = import_foods(records, args.user_id)
    print(f"Imported {created} foods, updated {updated} existing entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
