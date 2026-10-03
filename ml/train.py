import json
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import f1_score
from common import *

df, Y = load_data()
if (df.split == "train").sum() < 30 or (df.split == "validation").sum() < 5:
    raise SystemExit("Not enough data: run assign_splits.py and validate_data.py, "
                     "and add more rows to raw_reviews.csv")
tr, va = (df.split == "train").values, (df.split == "validation").values
X = embed(df.clean.tolist())

def macro_f1(Yt, Yp, ok):
    fs = [f1_score(Yt[:, j], Yp[:, j], zero_division=0)
          for j in range(Yt.shape[1]) if ok[j] and Yt[:, j].sum() > 0]
    return float(np.mean(fs)) if fs else 0.0

def fit_heads(X, Y, C):
    n = Y.shape[1]
    W, b, ok = np.zeros((n, X.shape[1])), np.full(n, -10.0), np.zeros(n, bool)
    for j in range(n):
        if Y[:, j].sum() < MIN_POS_TRAIN:      # too few examples -> disabled
            continue
        m = LogisticRegression(C=C, class_weight="balanced", max_iter=2000).fit(X, Y[:, j])
        W[j], b[j], ok[j] = m.coef_[0], m.intercept_[0], True
    return W, b, ok

def tune(P, Y, ok):
    grid, thr = np.arange(0.2, 0.81, 0.05), np.full(P.shape[1], 0.5)
    for j in range(P.shape[1]):
        if not ok[j] or Y[:, j].sum() < 5: continue
        thr[j] = grid[int(np.argmax([f1_score(Y[:, j], P[:, j] >= t, zero_division=0) for t in grid]))]
    return thr

# 1) Baseline: character n-gram TF-IDF (the floor to beat)
tf = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=2, sublinear_tf=True)
Xt, Xv = tf.fit_transform(df.clean[tr]), tf.transform(df.clean[va])
Pb, okb = np.zeros((va.sum(), len(LABELS))), np.zeros(len(LABELS), bool)
for j in range(len(LABELS)):
    if Y[tr, j].sum() < MIN_POS_TRAIN: continue
    Pb[:, j] = LogisticRegression(C=5, class_weight="balanced", max_iter=2000).fit(Xt, Y[tr, j]).predict_proba(Xv)[:, 1]
    okb[j] = True
base = macro_f1(Y[va], Pb >= 0.5, okb)
print(f"baseline TF-IDF val macro-F1: {base:.3f}")

# 2) Choose C on validation
best = None
for C in [0.5, 1, 2, 5, 10]:
    W, b, ok = fit_heads(X[tr], Y[tr], C)
    f = macro_f1(Y[va], probs(X[va], W, b) >= 0.5, ok)
    print(f"C={C}: val macro-F1 {f:.3f}")
    if best is None or f > best[0]: best = (f, C, W, b, ok)
f, C, W, b, ok = best

# 3) Tune per-label thresholds on validation
thr = tune(probs(X[va], W, b), Y[va], ok)
f_tuned = macro_f1(Y[va], probs(X[va], W, b) >= thr, ok)
print(f"chosen C={C}; val macro-F1 with tuned thresholds {f_tuned:.3f}")
print("disabled labels:", [LABELS[j] for j in range(len(LABELS)) if not ok[j]])

# 4) Save a single source of truth for Python AND Java
json.dump({"version": VERSION, "encoder": ENCODER, "prefix": PREFIX, "max_len": MAX_LEN,
           "min_chars": MIN_CHARS, "tested_langs": TESTED_LANGS, "labels": LABELS,
           "W": W.tolist(), "b": b.tolist(), "thresholds": thr.tolist(),
           "disabled": [LABELS[j] for j in range(len(LABELS)) if not ok[j]],
           "val_macro_f1": f_tuned, "baseline_val_macro_f1": base, "C": C},
          open(ART / f"head_{VERSION}.json", "w", encoding="utf-8"))