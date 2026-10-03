import json
from common import *
from infer import Classifier

c = Classifier()
h = load_head()
print("disabled labels:", h["disabled"])
print("val macro-F1:", round(h["val_macro_f1"], 3), "| baseline:", round(h["baseline_val_macro_f1"], 3))

for t in ["Great guide but the road was terrible, we got lost twice.",
          "The tasting was the highlight and the price was very fair."]:
    p = c.scores(t)
    top = np.argsort(-p)[:5]
    print("\n", t)
    for j in top:
        print(f"  {LABELS[j]:22s} score={p[j]:.3f}  threshold={c.thr[j]:.2f}  {'HIT' if p[j] >= c.thr[j] else ''}")