import sys
from common import *

df = pd.read_csv(DATA)
err, warn = [], []
need = ["id", "text", "language", "rating", "labels", "source", "group", "split"]
miss = [c for c in need if c not in df.columns]
if miss: sys.exit(f"missing columns: {miss}")

if df.id.duplicated().any(): err.append("duplicate ids")
if df.text.isna().any(): err.append("empty text rows")
df["clean"] = df.text.astype(str).apply(normalize).str.lower()
if df.clean.duplicated().any(): err.append(f"{df.clean.duplicated().sum()} duplicate texts")
if not set(df.split) <= {"train", "validation", "test"}: err.append("bad split values")
if not set(df.source) <= {"synthetic", "handwritten", "yelp"}: err.append("bad source values")

df["ls"] = df["labels"].fillna("").apply(parse_labels)
unknown = {l for ls in df.ls for l in ls} - set(LABELS)
if unknown: err.append(f"unknown labels: {unknown}")
if (df.groupby("group").split.nunique() > 1).any(): err.append("a group spans several splits")
if (df[df.source == "handwritten"].split != "test").any(): err.append("handwritten rows outside test")
if len(df) == 0:
    sys.exit("ERROR: reviews.csv has no rows")
for s in ("train", "validation", "test"):
    if (df.split == s).sum() == 0:
        err.append(f"no rows in split '{s}'")
print("rows per split:\n", df.split.value_counts().to_string())
print("rows per language:\n", df.language.value_counts().to_string())
counts = pd.DataFrame({s: pd.Series([l for ls in df[df.split == s].ls for l in ls]).value_counts()
                       for s in ["train", "validation", "test"]}).reindex(LABELS).fillna(0).astype(int)
print(counts.to_string())
for l, r in counts.iterrows():
    if r.train < MIN_POS_TRAIN: warn.append(f"{l}: only {r.train} train positives (will be DISABLED)")
    elif r.validation < 5 or r.test < 5: warn.append(f"{l}: val/test support very small")
for w in warn: print("WARN", w)
for e in err: print("ERROR", e)
sys.exit(1 if err else 0)