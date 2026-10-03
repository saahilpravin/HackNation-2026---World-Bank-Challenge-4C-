from common import *

class Classifier:
    def __init__(self):
        self.h = load_head()
        self.W, self.b = np.array(self.h["W"]), np.array(self.h["b"])
        self.thr = np.array(self.h["thresholds"])

    def scores(self, text):
        return probs(embed([normalize(text)], cache=False), self.W, self.b)[0]

    def analyze(self, review_id, text, language=None, rating=None):
        t = normalize(text)
        hits = []
        if len(t) >= MIN_CHARS:
            p = self.scores(t)
            hits = [(LABELS[j], float(p[j])) for j in range(len(LABELS)) if p[j] >= self.thr[j]]
        aspects = [{"aspect": l[:-1], "sentiment": "positive" if l[-1] == "+" else "negative",
                    "score": round(s, 2)} for l, s in hits]
        pos = any(a["sentiment"] == "positive" for a in aspects)
        neg = any(a["sentiment"] == "negative" for a in aspects)
        if pos or neg:
            overall = "mixed" if pos and neg else "positive" if pos else "negative"
        elif rating is not None:
            overall = "positive" if rating >= 4 else "negative" if rating <= 2 else "neutral"
        else:
            overall = "unknown"
        untested = language is not None and language not in TESTED_LANGS
        return {"review_id": review_id, "aspects": aspects, "overall_sentiment": overall,
                "needs_review": len(aspects) == 0 or untested, "model_version": self.h["version"]}

if __name__ == "__main__":
    c = Classifier()
    print(c.analyze(1, "Great guide but the road was terrible, we got lost twice.", "en"))