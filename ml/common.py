import hashlib, json, re, unicodedata
from pathlib import Path
import numpy as np, pandas as pd

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "reviews.csv"
ART = ROOT / "artifacts"; ART.mkdir(exist_ok=True)

from labels_config import ASPECTS
LABELS = [f"{a}{s}" for a in ASPECTS for s in "+-"]   # index 2i = '+', 2i+1 = '-'

ENCODER = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
PREFIX = ""            # use "query: " with multilingual-e5-small
MAX_LEN = 128
MIN_CHARS = 10         # characters, not words (Chinese/Thai have no spaces)
MIN_POS_TRAIN = 15
VERSION = "v1"
TESTED_LANGS = ["en", "sw"]    # edit: languages you actually evaluated

def normalize(t):
    t = unicodedata.normalize("NFKC", str(t))
    return re.sub(r"\s+", " ", t).strip()

def parse_labels(s):
    return [x for x in str(s).split("|") if x and x != "nan"]

def load_data():
    df = pd.read_csv(DATA)
    df["labels"] = df["labels"].fillna("").apply(parse_labels)
    df["clean"] = df["text"].apply(normalize)
    Y = np.array([[int(l in ls) for l in LABELS] for ls in df["labels"]])
    return df, Y

_enc = None
def encoder():
    global _enc
    if _enc is None:
        from sentence_transformers import SentenceTransformer
        _enc = SentenceTransformer(ENCODER)
        _enc.max_seq_length = MAX_LEN
    return _enc

def embed(texts, cache=True):
    key = hashlib.md5("\n".join([ENCODER, PREFIX, str(MAX_LEN), *texts]).encode()).hexdigest()[:12]
    f = ART / f"emb_{key}.npy"
    if cache and f.exists():
        return np.load(f)
    X = encoder().encode([PREFIX + t for t in texts], batch_size=32,
                         normalize_embeddings=True, show_progress_bar=True)
    if cache:
        np.save(f, X)
    return X

def probs(X, W, b):
    return 1 / (1 + np.exp(-(X @ W.T + b)))

def load_head():
    return json.load(open(ART / f"head_{VERSION}.json", encoding="utf-8"))