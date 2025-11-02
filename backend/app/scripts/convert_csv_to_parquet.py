"""Convert USDA CSV files to Parquet format for faster loading."""
import logging
from pathlib import Path
import polars as pl

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_csv_to_parquet(csv_path: Path, parquet_path: Path) -> bool:
    """Convert a CSV file to Parquet format."""
    try:
        logger.info(f"Converting {csv_path.name}...")
        df = pl.read_csv(csv_path, ignore_errors=True)
        parquet_path.parent.mkdir(parents=True, exist_ok=True)
        df.write_parquet(parquet_path, compression="snappy")
        logger.info(f"✅ Converted {csv_path.name} → {parquet_path.name} ({len(df):,} rows)")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to convert {csv_path.name}: {e}")
        return False

def main():
    """Convert all CSV files in FoodData_Central_csv to Parquet."""
    data_dir = Path(__file__).parent.parent / 'data' / 'FoodData_Central_csv'
    parquet_dir = Path(__file__).parent.parent / 'data' / 'FoodData_Central_csv_parquet'
    
    if not data_dir.exists():
        logger.error(f"Data directory not found: {data_dir}")
        return
    
    parquet_dir.mkdir(parents=True, exist_ok=True)
    
    csv_files = list(data_dir.glob("*.csv"))
    logger.info(f"Found {len(csv_files)} CSV files to convert")
    
    converted = 0
    for csv_file in csv_files:
        parquet_file = parquet_dir / f"{csv_file.stem}.parquet"
        
        # Skip if already converted and newer
        if parquet_file.exists() and parquet_file.stat().st_mtime > csv_file.stat().st_mtime:
            logger.info(f"⏭️  Skipping {csv_file.name} (already converted)")
            continue
        
        if convert_csv_to_parquet(csv_file, parquet_file):
            converted += 1
    
    logger.info(f"🎉 Conversion complete! Converted {converted}/{len(csv_files)} files")
    logger.info(f"📁 Parquet files saved to: {parquet_dir}")

if __name__ == "__main__":
    main()

