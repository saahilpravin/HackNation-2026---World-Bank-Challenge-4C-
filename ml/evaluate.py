from sklearn.metrics import precision_recall_fscore_support, f1_score
from common import *

df, Y = load_data()
h = load_head()
W, b, thr = (np.array(h[k]) for k in ("W", "b", "thresholds"))
P = probs(embed(df.clean.tolist()), W, b)
pred = (P >= thr).astype(int)
te = (df.split == "test").values

def collapse(M):   # ignore polarity: did we find the right ASPECTS?
    return np.stack([M[:, 2*i] | M[:, 2*i+1] for i in range(len(ASPECTS))], 1)

def micro(mask, A=Y, B=pred):
    return f1_score(A[mask].ravel(), B[mask].ravel(), zero_division=0)

p, r, f, s = precision_recall_fscore_support(Y[te], pred[te], zero_division=0)
print(pd.DataFrame({"precision": p, "recall": r, "f1": f, "support": s}, index=LABELS).round(2).to_string())
print(f"\nTEST micro-F1 (label+polarity): {micro(te):.3f}")
print(f"TEST micro-F1 (aspect only):    {micro(te, collapse(Y), collapse(pred)):.3f}")

for col in ("language", "source"):
    print(f"\nBy {col}:")
    for v in df[col][te].unique():
        m = te & (df[col] == v).values
        note = "  <- n too small to trust" if m.sum() < 10 else ""
        print(f"  {v:12s} n={m.sum():3d}  micro-F1={micro(m):.3f}{note}")

flips = sum(1 for i in np.where(te)[0] for a in range(len(ASPECTS))
            if Y[i, 2*a] and pred[i, 2*a+1] and not pred[i, 2*a])
flips += sum(1 for i in np.where(te)[0] for a in range(len(ASPECTS))
             if Y[i, 2*a+1] and pred[i, 2*a] and not pred[i, 2*a+1])
nr = pred[te].sum(1) == 0
print(f"\nPolarity flips (right aspect, wrong sign): {flips}")
print(f"Flagged needs_review: {nr.mean():.0%} of test rows")

rows = []
for i in np.where(te)[0]:
    exp = {LABELS[j] for j in np.where(Y[i])[0]}
    got = {LABELS[j] for j in np.where(pred[i])[0]}
    top = int(P[i].argmax())
    rows.append(dict(id=df.id[i], text=df.text[i], language=df.language[i], source=df.source[i],
                     expected="|".join(sorted(exp)), predicted="|".join(sorted(got)),
                     missed="|".join(sorted(exp - got)), extra="|".join(sorted(got - exp)),
                     top_label=LABELS[top], top_score=round(float(P[i, top]), 3),
                     exact=exp == got, needs_review=len(got) == 0))
out = pd.DataFrame(rows)
out.to_csv(ART / "evaluation.csv", index=False, encoding="utf-8-sig")  # opens cleanly in Excel
out["n_err"] = out.missed.str.count(r"\|") + out.extra.str.count(r"\|") + (out.missed != "") + (out.extra != "")
print("\n20 worst errors:")
print(out.sort_values("n_err", ascending=False).head(20)[["text", "expected", "predicted"]].to_string())