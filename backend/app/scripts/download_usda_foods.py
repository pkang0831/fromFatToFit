from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Iterable, Sequence, TextIO


class _RateLimiter:
    """Simple rate limiter enforcing a maximum number of calls per window."""

    def __init__(self, *, max_calls: int | None, window_seconds: float) -> None:
        self._max_calls = max_calls
        self._window_seconds = window_seconds
        self._window_start = time.monotonic()
        self._calls = 0

    def wait(self) -> None:
        if not self._max_calls:
            return
        now = time.monotonic()
        elapsed = now - self._window_start
        if elapsed >= self._window_seconds:
            self._window_start = now
            self._calls = 0
        if self._calls >= self._max_calls:
            remaining = self._window_seconds - elapsed
            if remaining > 0:
                time.sleep(remaining)
            self._window_start = time.monotonic()
            self._calls = 0
        self._calls += 1


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
    requests_per_hour: int | None,
) -> Iterable[dict]:
    page = start_page
    retrieved_pages = 0
    rate_limiter = _RateLimiter(max_calls=requests_per_hour, window_seconds=3600.0)
    while True:
        rate_limiter.wait()
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


def dump_foods_parquet(
    foods: Iterable[dict],
    path: str,
    *,
    batch_size: int,
) -> int:
    from pathlib import Path

    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "pyarrow is required to write Parquet output. Install it or select a JSON format."
        ) from exc

    target_path = Path(path)
    if parent := target_path.parent:
        parent.mkdir(parents=True, exist_ok=True)

    writer: pq.ParquetWriter | None = None
    buffer: list[dict] = []
    count = 0

    def flush() -> None:
        nonlocal writer, buffer, count
        if not buffer:
            return
        table = pa.Table.from_pylist(buffer)
        if writer is None:
            writer = pq.ParquetWriter(str(target_path), table.schema)
        writer.write_table(table)
        count += len(buffer)
        buffer = []

    try:
        for food in foods:
            buffer.append(food)
            if len(buffer) >= batch_size:
                flush()
        flush()
    finally:
        if writer is not None:
            writer.close()

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
        default=3.6,
        help="Delay in seconds between API calls to avoid rate limiting",
    )
    parser.add_argument(
        "--requests-per-hour",
        type=int,
        default=1000,
        help="Maximum number of USDA API requests per hour (set to 0 to disable)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="HTTP timeout for USDA API requests in seconds",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Where to write the downloaded foods (default: stdout for JSON output)",
    )
    parser.add_argument(
        "--format",
        choices=("jsonl", "json", "parquet"),
        default="jsonl",
        help="Output format for the downloaded foods",
    )
    parser.add_argument(
        "--parquet-batch-size",
        type=int,
        default=500,
        help="Number of records to buffer before writing a Parquet row group",
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
    if args.requests_per_hour is not None and args.requests_per_hour < 0:
        parser.error("--requests-per-hour cannot be negative")
    if args.format == "parquet" and not args.output:
        parser.error("--output is required when --format is parquet")
    if args.parquet_batch_size <= 0:
        parser.error("--parquet-batch-size must be a positive integer")
    if args.pretty and args.format != "json":
        parser.error("--pretty is only supported when --format is json")

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
        requests_per_hour=args.requests_per_hour or None,
    )

    try:
        if args.format == "parquet":
            count = dump_foods_parquet(
                foods,
                args.output,
                batch_size=args.parquet_batch_size,
            )
            print(f"Wrote {count} food records to {args.output}")
            return 0

        destination: TextIO | None = None
        close_destination = False
        try:
            if args.output:
                destination = open(args.output, "w", encoding="utf-8")
                close_destination = True
            else:
                destination = sys.stdout

            pretty = args.pretty if args.format == "json" else False
            count = dump_foods(foods, destination, pretty=pretty)
        finally:
            if close_destination and destination is not None:
                destination.close()
    except BrokenPipeError:  # pragma: no cover - depends on shell piping
        return 1

    if args.output:
        print(f"Wrote {count} food records to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
