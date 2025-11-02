from pathlib import Path
import pandas as pd

path = Path("backend/app/data/medallion/gold/food_search.parquet")
df = pd.read_parquet(path)
mask = df["description"].str.contains("CHICKEN Breast", case=False, na=False)
print(df.loc[mask][['brand_owner','branded_food_category']].head())