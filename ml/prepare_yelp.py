import json, random, re
from pathlib import Path
import pandas as pd
from labels_config import ASPECTS, KEYWORDS

random.seed(11)
DATA = Path(__file__).parent / "data"
BIZ = DATA / "yelp" / "yelp_academic_dataset_business.json"
REV = DATA / "yelp" / "yelp_academic_dataset_review.json"
OUT = DATA / "raw_reviews.csv"

CATS = {"Tours", "Farms", "Food Tours", "Coffee & Tea", "Coffee Roasteries", "Wineries",
        "Hotels & Travel", "Bed & Breakfast", "Resorts", "Local Flavor", "Specialty Food"}
PER_STAR = 100            # reviews kept per star rating (500 total)
MIN_W, MAX_W = 15, 120    # word-count window; the encoder truncates near 128 tokens

# 1) businesses in the categories we care about
biz = set()
with open(BIZ, encoding="utf-8") as f:
    for line in f:
        b = json.loads(line)
        if b.get("categories") and CATS & {c.strip() for c in b["categories"].split(",")}:
            biz.add(b["business_id"])
print(len(biz), "matching businesses")

# 2) stream reviews, keep a reservoir of up to 5000 per star
pool = {s: [] for s in range(1, 6)}
seen = {s: 0 for s in range(1, 6)}
with open(REV, encoding="utf-8") as f:
    for line in f:
        r = json.loads(line)
        if r["business_id"] not in biz:
            continue
        n = len(r["text"].split())
        if not MIN_W <= n <= MAX_W:
            continue
        s = int(r["stars"]); seen[s] += 1
        if len(pool[s]) < 5000:
            pool[s].append(r)
        else:
            k = random.randint(0, seen[s] - 1)
            if k < 5000: pool[s][k] = r

# 3) weak labels: keyword hit -> sign from stars (4-5 = +, 1-2 = -, 3 = skip)
def weak_labels(text, stars):
    if stars == 3: return []
    sign = "+" if stars >= 4 else "-"
    t = text.lower()
    return [a + sign for a in ASPECTS if any(k in t for k in KEYWORDS.get(a, []))]

rows = []
for s, items in pool.items():
    for r in random.sample(items, min(PER_STAR, len(items))):
        text = re.sub(r"\s+", " ", r["text"]).strip()
        rows.append(dict(id=f"yelp-{len(rows)+1}", text=text, language="en", rating=s,
                         labels="|".join(weak_labels(text, s)), source="yelp",
                         group=r["business_id"]))
new = pd.DataFrame(rows)

# 4) merge into raw_reviews.csv, dropping old seed rows
old = pd.read_csv(OUT) if OUT.exists() and OUT.stat().st_size > 0 else pd.DataFrame(columns=new.columns)
old = old[~old["id"].astype(str).str.startswith(("seed-", "yelp-"))]
out = pd.concat([old, new]).drop_duplicates("text")
out.to_csv(OUT, index=False, encoding="utf-8")
print(len(new), "yelp rows added;", len(out), "total")
print(new.labels.str.split("|").explode().value_counts().to_string())