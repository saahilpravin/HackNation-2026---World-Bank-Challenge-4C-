from optimum.onnxruntime import ORTModelForFeatureExtraction
from transformers import AutoTokenizer
from common import *
from infer import Classifier

out = ART / "encoder"
m = ORTModelForFeatureExtraction.from_pretrained(ENCODER, export=True)
m.save_pretrained(out)
tok = AutoTokenizer.from_pretrained(ENCODER); tok.save_pretrained(out)   # writes tokenizer.json

# Golden file: Python's answers that Java must reproduce
df, _ = load_data()
texts = df[df.split == "test"].text.sample(min(40, (df.split == "test").sum()), random_state=0).tolist()
texts += ["ok", "😍😍😍 best tour ever!!", "Great guide. " * 80,        # emoji + >128 tokens (truncation)
          "Habari! Mwongozo alikuwa mzuri sana lakini barabara ni mbaya."]
clf = Classifier()
json.dump([{"text": t, "probs": [round(float(x), 6) for x in clf.scores(t)]} for t in texts],
          open(ART / "golden.json", "w", encoding="utf-8"), ensure_ascii=False)

# Sanity check: is the ONNX export itself faithful? (isolates export bugs from Java bugs)
t = normalize(texts[0])
enc = tok([PREFIX + t], return_tensors="np", truncation=True, max_length=MAX_LEN)
h = m(**enc).last_hidden_state[0]; mask = enc["attention_mask"][0][:, None]
e = (h * mask).sum(0) / mask.sum(); e /= np.linalg.norm(e)
print("max diff ONNX vs torch embedding:", float(np.abs(e - embed([t], cache=False)[0]).max()))