# Lauda review brief and visual feedback dashboard

Implemented 2026-10-04 in `codex/lauda-mvp`.

## Payload to screen mapping

| Backend field | Mobile display | Meaning |
| --- | --- | --- |
| `narrative.summary` | Dark review-brief card at the top of Insights | Local Qwen overview of ranked classified themes, with exact coverage composed by Java |
| `meta.total / analysed / unread / translated` | Review metrics and quiet coverage line | All processed inputs; inclusion is distinct from processing |
| `quantitative.average_rating / rating_distribution` | Circular rating graphic and five horizontal star bars | Actual original review stars, not an AI business score |
| `quantitative.sentiment` | Colored stacked strip and labeled counts | Detected overall sentiment; backend uses star fallback when aspects are absent |
| `quantitative.aspects` | Ranked positive/negative mention bars | Uses every counted aspect, not just the three featured qualitative cards |
| `qualitative.strengths / problems` | Positive and Negative feedback cards | Count, share, human-readable label; tap to expand source evidence |
| Finding `quotes / review_ids` | Evidence excerpt, original/English toggle, review link | Original text and local NLLB provenance remain attached; links come from backend IDs |
| `quantitative.trend` | Monthly rating line, only with two or more rated months | No fabricated upward trend when the demo has only one month |
| `attention.unread_review_ids` | A closer look | Reviews processed but excluded from aspect insights |
| Per-review `overall_sentiment / sentiment_source / aspects` | Sentiment banner and compact semicircle gauges | Aspect activation is explicitly labeled as a model score, not business quality |
| App review reply state | Review-desk progress bar and card status | Already answered demo examples and locally approved replies count as handled |

Graphics have text equivalents for accessibility. Color is accompanied by labels/counts. Bars share a consistent scale; several aspects can occur in one review. Positive and negative counts do not add to the number of reviews. Unknown/mixed sentiment is retained. Synthetic feedback stays identified as demo data.

## Design changes and files

- `src/components/feedback-graphics.tsx`: rating ring, star distribution, sentiment strip, aspect bars, real monthly rating line and reply-progress graphic. SVG drawings use the installed Expo-compatible library; no remote image, font or chart service is required.
- `src/app/(tabs)/insights.tsx`: centralized brief, smaller metrics, responsive chart cards, expandable evidence, compact coverage and checking section. Results automatically load and save; refresh failures retain previous findings.
- `src/app/(tabs)/reviews.tsx`: compact review desk, rating ring, reply progress, horizontally scrollable status filters, single search bar with expandable language filter, clear review cards.
- `src/components/review-analysis.tsx`: sentiment banner, responsive aspect gauges, evidence and optional reply templates.
- `src/app/reviews/[id].tsx`: clearer review detail title; writing-language selectors and response editor share one card, reducing repeated containers. Translation, draft saving and human approval remain explicit.
- `src/ai/insights-api.ts`: v4 cache identity refreshes the old failed-summary result; existing strict payload decoder and job polling are retained.
- `backend/src/main/java/com/lauda/api/service/InsightsLlmService.java`: simplified local paragraph generation and measured-scope cache key.
- `backend/src/main/resources/prompts/insights-system.txt`: concise English overview instructions.
- `backend/src/test/java/com/lauda/api/service/InsightsLlmServiceTest.java`: malformed/invented-count rejection, leading-theme checks, successful generation, changed-scope cache invalidation, timeout and unavailable-model checks.

## Local summary implementation

The classifier processes all original reviews, using cached local NLLB translations where needed. Java counts the eligible aspect hits. It ranks all positive and negative aspect statistics and supplies canonical English theme labels in that order to pinned `qwen3:0.6b` through loopback Ollama.

The tiny model writes one short paragraph from those themes. It does not receive raw review text, invent numeric scores, or generate evidence IDs. Java validates the single-string JSON structure, length, paragraph form, leading themes, and absence of generated numeric facts/links/markdown. Java prepends actual processed/included/checking counts and the measured average review rating. The endpoint retains `aspect_notes: []` for compatibility; deterministic qualitative findings provide the clickable evidence.

This reduces the v1 failure caused by asking a tiny model to exactly pair quoted sentences with IDs. It also prevents review-text instructions from entering the summary prompt. It does not prove semantic accuracy: classifier mistakes propagate into the summary, and the generated wording must be checked.

The generation cache includes metadata, quantitative payload, ranked themes, model digest, prompt version and classifier version. Identical theme names with a different corpus size cannot reuse a paragraph containing old counts. Only one generation runs at once. Missing models, timeouts and invalid output leave counted findings available and show an explicit unavailable summary; no cloud fallback occurs.

## Offline and mobile behavior

The laptop is the inference device, as selected for this demo. Qwen, NLLB and the ONNX classifier use locally downloaded models. After preparing dependencies/weights once, keep these separate terminals running in the updated checkout:

```sh
npm run ai:llm
```

```sh
npm run translate:offline
```

```sh
npm run ai:backend
```

`ai:backend` runs the built Java jar offline with narration enabled. Build the updated jar first with `python3 scripts/start-review-ai.py` or the offline Maven command once dependencies are already cached. See `OFFLINE-LLM-RUNBOOK.md` for first-time model setup and pinned digests.

The native app stores results including the paragraph in existing Expo SQLite state. The browser preview uses localStorage. Cached results render without the backend. A fresh summary needs the local services, but no internet after preparation. A phone must remain connected to the laptop over a local network/hotspot; this is not phone-only LLM inference. Figma does not execute the model.

For the laptop preview, export the app and keep its local static server running:

```sh
npx expo export --platform web --output-dir dist
python3 scripts/serve-demo.py
```

Open `http://localhost:8087/insights` or `http://localhost:8087/reviews`.

## Verified behavior

The actual 150-review demo produced a validated local overview with 135 translated reviews, zero translation failures, 102 included and 48 needing checking. Observed model service latency was 0.969–2.443 seconds in successful full-batch requests after translation caching; first-time translation can take many minutes.

Checks covered frontend contracts, Java tests, typecheck, lint and web export; phone-width visual checks; expanding finding evidence; review sentiment/gauge controls; and saved Insights reloading with Java stopped. A refresh while Java was stopped reported a connection error and kept the saved paragraph/charts. Java was restored after that check. A physical iPhone and actual Wi-Fi-off end-to-end demo remain acceptance tests for the team.
