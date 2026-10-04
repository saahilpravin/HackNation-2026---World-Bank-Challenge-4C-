import random
from pathlib import Path
import pandas as pd

OUT = Path(__file__).parent / "data" / "raw_reviews.csv"
if OUT.exists() and len(pd.read_csv(OUT)) > 0:
    raise SystemExit("raw_reviews.csv already has rows; not overwriting.")

random.seed(7)
P = {
 "guide+": ["our guide was friendly and knew everything about coffee", "the guide explained each step so clearly",
            "such a warm and knowledgeable host", "the guide made the whole visit fun", "great storyteller, our guide", "the guide answered all our questions patiently"],
 "guide-": ["the guide barely spoke to us", "our guide seemed bored and rushed", "the guide could not answer simple questions",
            "the guide was late and unprepared", "the guide was rude to some of the group", "i could not understand the guide at all"],
 "coffee_tasting+": ["the coffee tasting was the highlight", "loved picking and roasting the beans ourselves", "the freshly roasted coffee was amazing",
                     "the tasting session taught us so much about flavour", "best cup of coffee of the whole trip", "the roasting demo was fascinating"],
 "coffee_tasting-": ["the tasting was too short", "the coffee was cold and bitter", "we only got one tiny sample to try",
                     "the roasting demo was skipped", "the coffee tasted burnt", "the tasting felt rushed and boring"],
 "price_value+": ["very good value for the price", "totally worth every shilling", "cheap for such a rich experience",
                  "fair price and nothing hidden", "great value for a half day", "the price was more than reasonable"],
 "price_value-": ["way too expensive for what we got", "not worth the money", "the price was higher than advertised",
                  "they charged extra for everything", "overpriced for a short visit", "poor value for money"],
 "communication+": ["booking was easy and replies were quick", "they sent clear directions and confirmed everything",
                    "the host answered our messages within minutes", "very clear instructions before the visit", "communication was excellent", "they confirmed our booking right away"],
 "communication-": ["nobody replied to our booking message", "the confirmation never arrived", "we got conflicting information about the time",
                    "no one told us what to bring", "language barrier made booking difficult", "the host was impossible to reach"],
 "facilities+": ["the toilets were clean and there was shade to sit in", "comfortable seating and a very clean site",
                 "felt safe and well organised", "nice shaded area for resting", "the facilities were spotless", "plenty of seats and clean washrooms"],
 "facilities-": ["the toilets were dirty", "no shade and nowhere to sit", "felt unsafe on the steep path",
                 "the site was dirty and neglected", "no clean water or washrooms", "very few seats for older visitors"],
 "access_transport+": ["easy to find and the road was fine", "the directions were spot on and parking was easy",
                       "short ride from town on a decent road", "simple to reach by taxi", "good road all the way", "the farm was easy to find"],
 "access_transport-": ["the road was terrible and we got lost", "very hard to find without a local", "no taxis would take us up the hill",
                       "the track was muddy and almost impassable", "far from town with no clear signs", "we got lost twice on the way"],
 "food+": ["the lunch was delicious and plentiful", "loved the local snacks they served", "fresh maize and beans for lunch were lovely",
           "the homemade food was a treat", "great tea and fresh fruit", "the meal was generous and tasty"],
 "food-": ["the food was cold and bland", "lunch was tiny and not what we ordered", "nothing vegetarian was offered",
           "the snacks ran out before we got any", "the meal was disappointing", "we waited ages for food"],
 "other+": ["a lovely peaceful place", "beautiful views over the highlands", "would definitely come back",
            "a memorable day out", "the whole place has a lovely atmosphere", "highly recommend to anyone visiting"],
 "other-": ["the rain ruined the day", "it was too crowded for us", "it felt more touristy than expected",
            "not what we had hoped for", "a disappointing visit overall", "would not recommend"],
}
OPEN = ["", "", "Honestly, ", "Overall, ", "We visited in July. ", "Quick review: ", "Update: ", "Went with my family. "]
CLOSE = ["", "", ".", "!", " Thanks.", " Just my opinion.", " Ok."]
KEYS = list(P)
rows, seen = [], set()

def add(labels):
    for _ in range(20):
        text = random.choice(OPEN) + " but ".join(random.sample([random.choice(P[l]) for l in labels], len(labels))) \
               if False else random.choice(OPEN) + (", but " if len({l[-1] for l in labels}) > 1 else " and ").join(
               random.choice(P[l]) for l in labels)
        text = text[0].upper() + text[1:] + random.choice(CLOSE)
        if text.lower() not in seen:
            seen.add(text.lower()); i = len(rows) + 1
            pos = sum(l.endswith("+") for l in labels); neg = len(labels) - pos
            rating = 5 if neg == 0 else 1 if pos == 0 else 3
            rows.append(dict(id=f"seed-{i}", text=text, language="en", rating=rating,
                             labels="|".join(labels), source="synthetic", group=f"seed-{i}"))
            return

for _ in range(8):                       # singles: ~8 per label pass
    for k in KEYS: add([k])
for _ in range(4):                       # singles again for volume
    for k in KEYS: add([k])
for _ in range(150):                     # pairs from different aspects
    a, b = random.sample(KEYS, 2)
    if a[:-1] != b[:-1]: add([a, b])
for t in ["Ok.", "Nothing to say really.", "asdf qwerty", "Selling phone cases, DM me for prices."]:
    for n in range(3):
        i = len(rows) + 1
        rows.append(dict(id=f"seed-{i}", text=t + " " * n if n == 0 else t + "." * n, language="en", rating=3,
                         labels="", source="synthetic", group=f"seed-{i}"))

pd.DataFrame(rows).drop_duplicates("text").to_csv(OUT, index=False, encoding="utf-8")
print(len(rows), "seed rows written to", OUT)