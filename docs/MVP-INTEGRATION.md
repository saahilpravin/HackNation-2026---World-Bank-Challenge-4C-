# Lauda MVP integration: plan, payload mapping and operation

## Scope and merge strategy

The requested inputs are backend `main` at `e0dc2b4` and frontend `codex/noor-ai-starter` at `2768aec`. The frontend is merged into main's newer backend rather than replacing the backend with the older integration PR implementation. README conflicts and inherited `.gitignore` conflict markers are resolved. Manual-reply cleanup from `0444718` is preserved in the affected frontend files.

The minimum product has two inference flows:

1. **Insights:** original reviews -> Java `POST /v1/insights` -> overview, ratings, strengths/concerns and supporting review links -> locally persisted result.
2. **Response translator:** owner-written draft -> local NLLB `POST /translate` -> editable customer-language text -> saved draft or local approval.

No AI reply-generation UI is reintroduced. Java's existing `/v1/reviews/reply-draft` endpoint remains available for backend compatibility but is not called by the app. There is no Qwen requirement for this MVP. Backend findings combine MiniLM classification with fixed text; the app does not present that text as an LLM-written paragraph or its star rating as an AI score.

## Existing API to UI mapping

| Backend field / endpoint | Frontend destination | File |
| --- | --- | --- |
| `POST /v1/insights` request `owner_language`, `reviews[]` | Automatic request when Insights opens without a matching saved result | `src/ai/insights-api.ts`, `src/app/(tabs)/insights.tsx` |
| `meta.total`, `meta.analysed`, `meta.unread` | Business overview, analysed count and excluded-review explanation | `src/app/(tabs)/insights.tsx` |
| `meta.owner_language`, `meta.note` | English fallback notice when owner-language templates are absent | Same screen |
| `meta.model_version` | Saved-result model provenance | Same screen |
| `quantitative.average_rating` | Average rating displayed explicitly as review stars | Same screen |
| `qualitative.strengths[]` | Up to three concise “What’s working” findings | Same screen |
| `qualitative.problems[]` | Up to three “What needs attention” findings | Same screen |
| Finding `label`, `summary`, `quotes[]` | Category label, count-based summary, original evidence quote and review link | Same screen |
| `attention.unread_review_ids`, `attention.note` | “Needs a closer look” with review links | Same screen |
| `rating_distribution`, `sentiment`, `languages`, `aspects`, `trend`, finding `action` | Validated and saved for future displays, intentionally omitted from the minimal UI | `src/ai/insights-api.ts` |
| `GET /v1/health` | Test/save review service address | `src/app/offline.tsx` |
| NLLB `POST /translate`: `{text, from, to}` | Customer-language response, model provenance and latency | `src/ai/laptop-translation.ts`, `src/app/reviews/[id].tsx` |
| NLLB `GET /health` | Translation setup/pairing test | `src/app/offline.tsx` |

The Java endpoints accept numeric IDs, while app IDs are strings such as `r15`. The client sends sequential numeric IDs for each immutable request and maps every finding/evidence/unread ID back to its original string ID before saving. It rejects IDs outside that workspace, duplicate evidence IDs, incompatible envelopes and impossible counts. The original review text is submitted; authored English demo variants are not substituted for multilingual reviews.

## Source responsibilities

- `backend/src/main/java/com/lauda/api/controller/ReviewController.java`: real `/v1` routes, bounded unique-review validation, rating/date validation and browser-origin allowlist.
- `backend/src/main/java/com/lauda/api/service/ClassifierService.java`: existing encoder/head inference, serialized access, disabled-label filtering, ready check and head-content identifier.
- `backend/src/main/java/com/lauda/api/service/InsightService.java`: existing quantitative/qualitative aggregation; stable sorting and single-mention priority correction.
- `backend/src/main/java/com/lauda/api/service/Texts.java`: required English fallback catalogue checked at startup.
- `ml/artifacts/texts.json`: missing runtime catalogue supplied with human-authored English summaries/category names/actions and generic compatibility reply templates.
- `src/ai/insights-api.ts`: request mapping, response decoding, bounded timeouts and corpus cache identity.
- `src/data/types.ts`: optional insights cache/service address and translated-draft persistence fields.
- `src/state/store.tsx`, `src/data/storage.ts`, `src/data/storage.web.ts`: existing serialized save/load; SQLite on native and localStorage on web.
- `src/app/(tabs)/insights.tsx`: auto-load, loading/error/retry, restrained findings UI and saved results.
- `src/app/reviews/[id].tsx`: manual responses, translation, translated draft restore and approval.
- `src/app/offline.tsx`: configurable analysis/translation connections and accurate capability descriptions.
- `ai/translation/server.py`: NLLB bridge; final demo origins 8087/8088 allowed alongside 8082/8084.
- `scripts/setup-review-model.py`, `scripts/start-review-ai.py`, `scripts/serve-demo.py`: repeatable model setup, Java launch and local static preview.

## Save/load and unavailable services

An insights cache key incorporates API family, service address, owner language and sorted review IDs/text/language/rating/date. Reordering alone does not invalidate it; changed content/language/service does. A response for an obsolete workspace is not committed as current. Refresh failure retains the previous saved result. Cached findings display without a backend request, including after reopening the app.

A head content hash in `meta.model_version` distinguishes different heads previously both named `v1`. Cache matching does not poll health on every open to detect server model changes; explicitly refresh after deploying a new head. The MVP does not introduce a complete model-manifest registry.

Translated drafts now save customer-language text and provenance when it matches the current source/language key. Editing source text or language invalidates the translation. Local approval records exact final text and never claims external posting. Existing persisted data loads without a destructive reset because new fields are optional.

## Running the laptop demo

From the merged repository root, after `npm ci`, Java 17+ and Maven setup:

```sh
python3 scripts/setup-review-model.py
python3 scripts/start-review-ai.py
```

In separate terminals:

```sh
.venv-ai/bin/python ai/translation/server.py
npm run web
```

Create the Python environment/install dependencies and prepare NLLB first as described in `ai/translation/README.md`. `run.py` prepares/evaluates the checkpoint; `server.py` actually serves translation. The local encoder is checksum-verified and model weights are not committed.

For the static offline preview:

```sh
npx expo export --platform web --output-dir dist
python3 scripts/serve-demo.py
```

Use `http://localhost:8087/`. Keep Java and Python alive; downloaded local inference can continue with Wi-Fi/internet disabled. Model/package setup needs a connection initially. Browser storage is origin-specific, so changing host or port selects different stored data.

## Phone connectivity

Set review-service and translation addresses in **Offline & AI**. The default loopback addresses work on the laptop; on a phone they refer to the phone itself. For a trusted local demonstration, start Java with `LAUDA_API_HOST=YOUR_PRIVATE_WIFI_IP python3 scripts/start-review-ai.py --offline`, and start NLLB with `--bind YOUR_PRIVATE_WIFI_IP --port 8086`. Enter its current pairing code on the phone. Use a specific private address, not a public bind.

The phone must retain a local network connection to the laptop for new inference. Native records/cached results remain local without it. This is not phone-only inference. Java's LAN mode is a trusted-development setting without authentication; default binding remains loopback. Installed phone builds may need an HTTPS endpoint depending on transport restrictions.

## Checks and remaining work

Contract tests cover numeric/string ID mapping, unknown evidence, cache invalidation, offline errors and server validation. Java parity tests compare scores to the checked-in Python golden file. Translation bridge tests cover pairing and the final browser origins. These establish integration behavior, not model accuracy.

The model's multilingual coverage and recorded validation quality still need improvement. Unsupported/uncertain reviews are excluded from findings and linked for manual reading. The UI shows that exclusion instead of inventing findings for all 150 demo reviews. Evidence clauses are selected by the classifier and should be checked by the owner.

Next priorities: human-labeled aspect/evidence evaluation; better supported language coverage; real review import; a full model-manifest cache policy; optional generated Insights paragraphs only after the teammate's model is ready. Keep the current versioned payload contract or migrate server/client/tests together.

The documents under `docs/design/` are the pre-integration audit. Their old build blockers describe an earlier main snapshot, not the completed MVP.

## Verification recorded for this integration

- Frontend typecheck, lint and 35 TypeScript tests passed.
- Maven package completed with four Java tests, including Python/Java numerical parity and new contract checks.
- Three Python HTTP bridge tests passed, including the final preview origins and pairing rejection.
- Live `/v1/insights` accepted original English/French reviews and returned the expected versioned payload and CORS headers.
- The browser loaded 150 sample reviews automatically; 13 were included and 137 flagged/excluded. An evidence link opened the correct `r141` review.
- A new English response was translated by cached NLLB to French in approximately 10 seconds. This is a smoke test, not a quality benchmark or phone latency measurement.

The live examples also exposed classification false positives (for example, unrelated food/transport hits on a price/facilities complaint). The integration does not claim to fix training accuracy. Retrain/evaluate the head separately; the UI preserves evidence and excluded-review counts so operators can verify results.
