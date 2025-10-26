from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Iterable, Sequence, TextIO


API_ROOT = "https://api.nal.usda.gov/fdc/v1"
DEFAULT_DATA_TYPES = (
    "Branded",
    "Survey (FNDDS)",
    "Foundation",
    "SR Legacy",
)


def _request(
    api_key: str,
    path: str,
    payload: dict,
    timeout: float,
) -> list[dict]:
    url = f"{API_ROOT}/{path}?api_key={urllib.parse.quote(api_key)}"
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            if response.status != 200:
                raise RuntimeError(f"Unexpected status code {response.status}")
            body = response.read()
    except urllib.error.HTTPError as exc:
        message = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"USDA API request failed: {exc.reason}: {message}") from exc
    except urllib.error.URLError as exc:  # noqa: PERF203
        raise RuntimeError(f"Failed to reach USDA API: {exc.reason}") from exc

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:  # pragma: no cover - network failures already handled
        raise RuntimeError("Failed to decode USDA API response as JSON") from exc

    if not isinstance(parsed, list):
        raise RuntimeError("Unexpected USDA API response format; expected a list")
    return parsed


def iter_foods(
    api_key: str,
    *,
    data_types: Sequence[str] | None,
    page_size: int,
    start_page: int,
    max_pages: int | None,
    delay: float,
    timeout: float,
) -> Iterable[dict]:
    page = start_page
    retrieved_pages = 0
    while True:
        payload = {"pageSize": page_size, "pageNumber": page}
        if data_types:
            payload["dataType"] = list(data_types)
        foods = _request(api_key, "foods/list", payload, timeout)
        if not foods:
            break
        for food in foods:
            yield food
        retrieved_pages += 1
        if len(foods) < page_size:
            break
        if max_pages is not None and retrieved_pages >= max_pages:
            break
        page += 1
        if delay:
            time.sleep(delay)


def dump_foods(
    foods: Iterable[dict],
    destination: TextIO,
    *,
    pretty: bool,
) -> int:
    count = 0
    if pretty:
        destination.write("[\n")
        first = True
        for food in foods:
            if not first:
                destination.write(",\n")
            destination.write(json.dumps(food, ensure_ascii=False, indent=2))
            first = False
            count += 1
        destination.write("\n]\n")
        return count

    for food in foods:
        destination.write(json.dumps(food, ensure_ascii=False))
        destination.write("\n")
        count += 1
    return count


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download food records from the USDA FoodData Central API",
    )
    parser.add_argument(
        "--api-key",
        dest="api_key",
        default=None,
        help="USDA FoodData Central API key (defaults to USDA_API_KEY env variable)",
    )
    parser.add_argument(
        "--data-type",
        dest="data_types",
        action="append",
        help=(
            "Restrict results to specific data types (e.g. Branded, Foundation). "
            "May be provided multiple times. Defaults to all common types."
        ),
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=200,
        help="Number of foods to request per API call (max 200)",
    )
    parser.add_argument(
        "--start-page",
        type=int,
        default=1,
        help="Page number to start downloading from (1-indexed)",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Maximum number of pages to download (default: unlimited)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay in seconds between API calls to avoid rate limiting",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="HTTP timeout for USDA API requests in seconds",
    )
    parser.add_argument(
        "--output",
        type=argparse.FileType("w", encoding="utf-8"),
        default=sys.stdout,
        help="Where to write the downloaded foods (default: stdout)",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Write the output as a formatted JSON array instead of newline-delimited JSON",
    )
    args = parser.parse_args(argv)

    if args.api_key is None:
        args.api_key = _from_env("USDA_API_KEY")
    if not args.api_key:
        parser.error("An API key must be provided via --api-key or the USDA_API_KEY environment variable")

    if not args.data_types:
        args.data_types = list(DEFAULT_DATA_TYPES)

    if args.page_size <= 0 or args.page_size > 200:
        parser.error("--page-size must be between 1 and 200")
    if args.start_page <= 0:
        parser.error("--start-page must be at least 1")
    if args.max_pages is not None and args.max_pages <= 0:
        parser.error("--max-pages must be a positive integer")
    if args.delay < 0:
        parser.error("--delay cannot be negative")
    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")

    return args


def _from_env(name: str) -> str | None:
    import os

    value = os.getenv(name)
    if value is not None:
        stripped = value.strip()
        return stripped or None
    return None


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)

    foods = iter_foods(
        args.api_key,
        data_types=args.data_types,
        page_size=args.page_size,
        start_page=args.start_page,
        max_pages=args.max_pages,
        delay=args.delay,
        timeout=args.timeout,
    )

    try:
        count = dump_foods(foods, args.output, pretty=args.pretty)
    except BrokenPipeError:  # pragma: no cover - depends on shell piping
        return 1

    if args.output is not sys.stdout:
        print(f"Wrote {count} food records to {args.output.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
