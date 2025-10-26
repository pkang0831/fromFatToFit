from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Iterable, Sequence, TextIO, Optional


class _RateLimiter:
    """Simple rate limiter enforcing a maximum number of calls per window."""

    def __init__(self, *, max_calls: Optional[int], window_seconds: float) -> None:
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
    data_types: Optional[Sequence[str]],
    page_size: int,
    start_page: int,
    max_pages: Optional[int],
    delay: float,
    timeout: float,
    requests_per_hour: Optional[int],
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


def _parquet_row(food: dict) -> dict:
    """Return a normalized row for Parquet output.

    Keeping the schema stable across batches prevents pyarrow from
    complaining when optional USDA fields (e.g. ``foodCode`` vs
    ``ndbNumber``) appear in different records. We persist a handful of
    high-signal columns and tuck the full JSON payload into ``rawJson`` so
    no information is lost.
    """

    return {
        "fdcId": food.get("fdcId"),
        "dataType": food.get("dataType"),
        "description": food.get("description"),
        "publicationDate": food.get("publicationDate"),
        "rawJson": json.dumps(food, ensure_ascii=False),
    }


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

    writer: Optional[pq.ParquetWriter] = None
    buffer: list[dict] = []
    count = 0

    def flush() -> None:
        nonlocal writer, buffer, count
        if not buffer:
            return
        table = pa.Table.from_pylist(
            buffer,
            schema=pa.schema(
                [
                    ("fdcId", pa.int64()),
                    ("dataType", pa.string()),
                    ("description", pa.string()),
                    ("publicationDate", pa.string()),
                    ("rawJson", pa.large_string()),
                ]
            ),
        )
        if writer is None:
            writer = pq.ParquetWriter(str(target_path), table.schema)
        writer.write_table(table)
        count += len(buffer)
        buffer = []

    try:
        for food in foods:
            buffer.append(_parquet_row(food))
            if len(buffer) >= batch_size:
                flush()
        flush()
    finally:
        if writer is not None:
            writer.close()

    return count


def _load_env_file() -> None:
    """Attempt to load environment variables from a local .env file."""

    try:
        from dotenv import load_dotenv
    except ImportError:  # pragma: no cover - optional dependency
        return

    # load_dotenv searches the current working directory and parents by default.
    load_dotenv()


def _from_env(name: str) -> Optional[str]:
    import os

    value = os.getenv(name)
    if value is not None:
        stripped = value.strip()
        return stripped or None
    return None


if __name__ == "__main__":
    _load_env_file()

    API_KEY = _from_env("USDA_API_KEY")
    if not API_KEY:
        raise RuntimeError(
            "Set the USDA_API_KEY environment variable or replace API_KEY with your key."
        )

    DATA_TYPES: Sequence[str] = DEFAULT_DATA_TYPES
    PAGE_SIZE = 200
    START_PAGE = 1
    MAX_PAGES: Optional[int] = None
    DELAY_SECONDS = 3.6
    TIMEOUT_SECONDS = 30.0
    REQUESTS_PER_HOUR: Optional[int] = 1000

    OUTPUT_FORMAT = "parquet"  # Options: "parquet", "jsonl", "json"
    OUTPUT_PATH = "usda_foods.parquet"
    PARQUET_BATCH_SIZE = 500
    PRETTY_JSON = False

    SUPPORTED_FORMATS = {"parquet", "jsonl", "json"}
    if OUTPUT_FORMAT not in SUPPORTED_FORMATS:
        raise RuntimeError(
            f"Unsupported OUTPUT_FORMAT '{OUTPUT_FORMAT}'. Choose from {sorted(SUPPORTED_FORMATS)}."
        )

    foods = iter_foods(
        API_KEY,
        data_types=DATA_TYPES,
        page_size=PAGE_SIZE,
        start_page=START_PAGE,
        max_pages=MAX_PAGES,
        delay=DELAY_SECONDS,
        timeout=TIMEOUT_SECONDS,
        requests_per_hour=REQUESTS_PER_HOUR,
    )

    try:
        if OUTPUT_FORMAT == "parquet":
            if not OUTPUT_PATH:
                raise RuntimeError("OUTPUT_PATH must be set when OUTPUT_FORMAT is 'parquet'.")
            count = dump_foods_parquet(
                foods,
                OUTPUT_PATH,
                batch_size=PARQUET_BATCH_SIZE,
            )
            print(f"Wrote {count} food records to {OUTPUT_PATH}")
        else:
            destination: Optional[TextIO] = None
            close_destination = False
            try:
                if OUTPUT_PATH:
                    destination = open(OUTPUT_PATH, "w", encoding="utf-8")
                    close_destination = True
                else:
                    destination = sys.stdout

                pretty = PRETTY_JSON if OUTPUT_FORMAT == "json" else False
                count = dump_foods(foods, destination, pretty=pretty)
            finally:
                if close_destination and destination is not None:
                    destination.close()
            if OUTPUT_PATH:
                print(f"Wrote {count} food records to {OUTPUT_PATH}")
    except BrokenPipeError:  # pragma: no cover - depends on shell piping
        pass
