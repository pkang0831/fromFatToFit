import pandas as pd
from pathlib import Path

# Load the Parquet file
parquet_path = Path(__file__).parent.parent / "data" / "fooddb_parquet" / "food_data.parquet"
df = pd.read_parquet(parquet_path)

# Search for rows related to 'chicken breast' (case-insensitive search in both 'item' and 'description')
mask = (
    df["description"].str.lower().str.contains("chicken", na=False)
)
result = df[mask]


print(result)
