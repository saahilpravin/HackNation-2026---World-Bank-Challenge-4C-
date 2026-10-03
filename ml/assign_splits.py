import hashlib
from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
df = pd.read_csv(DATA_DIR / "raw_reviews.csv")

def split_of(r):
    if r.source == "handwritten":
        return "test"
    b = int(hashlib.md5(str(r.group).encode()).hexdigest(), 16) % 100
    return "train" if b < 70 else "validation" if b < 85 else "test"

df["split"] = df.apply(split_of, axis=1)
df.to_csv(DATA_DIR / "reviews.csv", index=False, encoding="utf-8")
print(df.split.value_counts())