# Local Qwen: implemented replies and customizable Insights

## What is implemented

The Java backend uses one pinned local Ollama Qwen3 4B Q4_K_M model for two independent tasks: review-specific response ideas and the Insights overview. The old 0.6B model was rejected for reply generation after inspection found complaint reversals and wrong-speaker phrasing. Weights are cached locally, not committed to Git. Model metadata and the exact installed digest are in `ai/insights/model-manifest.json`.

Replies use actual English review text or its real local NLLB translation. Obvious instruction clauses are filtered out of model input while the original review remains intact. The model returns short/detailed JSON drafts; owner-voice, length, duplicate, unsupported-topic and commitment checks run before use. One bounded retry is allowed. These checks reduce errors but do not prove factual correctness. The owner still edits and approves every reply. Unavailable/invalid generation returns explicitly labeled authored templates.

The owner writing language can be localized by NLLB. The customer-language translation is separately applied to the actual edited response. Draft-generation metadata is saved separately from translation metadata, so using NLLB does not erase where the suggestion originated.

Insights continues to classify every submitted review, keeping total/usable/flagged counts separate. Qwen sees ranked themes and bounded representative evidence, not all raw reviews at once. Java supplies exact counts and average rating in the paragraph prefix; the model writes the qualitative portion. Length, tone, focus and reading language settings are persisted. A saved analysis snapshot can regenerate narration without repeating classification or translation of the review corpus. Charts/counts remain unchanged when paragraph settings change.

## Runtime and setup

From the app repository root, prepare once while online:

```sh
npm ci
python3 scripts/setup-review-model.py
npm run translate:setup
python3 scripts/start-small-llm.py --setup
```

Install Ollama from its official download page if the launcher says it is missing. If the Qwen setup command started its own service, leave it open until readiness then stop it with Ctrl+C before continuing in that terminal. Setup uses the manifest's pinned model and checks the installed digest; it requires a one-time download of roughly 2.5 GB for Qwen4B, plus the separately cached NLLB/classifier assets. Python translation dependencies need the supported Python version reported by the setup script; Java/Maven are needed to build the backend.

Build the backend and browser app once:

```sh
npm run ai:build
npx expo export --platform web
```

Then start the prepared demo without downloads:

```sh
npm run demo:offline
```

Open `http://localhost:8087` and leave the terminal running. The launcher reuses matching ready services and starts missing cached services. Ctrl+C stops only processes it started. If an older server occupies a port, stop that server before launching the new version. A jar must be rebuilt after backend changes and a web export after client changes.

Separate terminals remain supported:

```sh
npm run ai:llm
npm run translate:offline
npm run ai:backend
python3 scripts/serve-demo.py
```

Default ports: app 8087, Java 8080, NLLB 8085, Ollama 11434. The model endpoints are loopback-only. Phone inference requires connection to a deliberately configured private laptop service; this is not Qwen running inside the iPhone. The laptop browser can use localhost with Wi-Fi off. A completely disconnected phone can use saved results and manual drafts but cannot request new laptop inference.

## Files and contracts

- `backend/src/main/java/com/lauda/api/service/LocalLlmClient.java`: pinned loopback runtime, JSON generation and a shared bounded queue (one active, at most four active/queued requests).
- `LocalOutputCache.java` in the same folder: bounded, versioned, atomic disk-backed cache; corrupt data is recomputed.
- `ReplyLlmService.java`: preparation, owner-voice prompt, validation, language localization and reply cache.
- `ReplyService.java`: Qwen first, authored-template fallback, approval flag always true.
- `InsightsLlmService.java`: ranked/evidence-backed context, preferences, exact numeric prefix, NLLB summary localization and narrative cache.
- `InsightService.java`: counting and versioned analysis snapshots. Snapshots with translation failures are not permanently cached, allowing retries.
- `ReviewTranslationService.java`: bidirectional NLLB and target-aware cache keys; legacy review-to-English cache entries remain usable.
- `backend/src/main/resources/prompts/reply-system.txt` and `insights-system.txt`: separate versioned task prompts.
- `backend/src/main/java/com/lauda/api/dto/Dto.java`: `Generation`, `SummarySettings`, `SummaryRequest`, optional `snapshot_id`, compatible constructors.
- `src/ai/review-api.ts`: source-aware draft decoding and content/context cache keys.
- `src/ai/insights-api.ts`: settings, canonical review ordering/ID mapping, batch progress, and summary-only calls.
- `src/components/review-analysis.tsx`: generated/template labels, cancellable requests and selectable examples.
- `src/app/reviews/[id].tsx`: editable drafts, preserved generation provenance, translation and local approval.
- `src/app/(tabs)/insights.tsx`: Customize summary controls and cached-first view; failed regeneration keeps the last valid overview.
- `src/data/types.ts`: backward-compatible optional persisted preferences/provenance fields. Existing JSON-backed native SQLite/browser storage saves them without resetting owner records.

`POST /v1/reviews/reply-draft` retains its endpoint and existing fields. Its optional `business_context` accepts only `experience` and `hours`. `generation` describes the reply model; top-level `model_version` describes the classifier.

`POST /v1/insights/jobs` retains batch analysis with optional summary `settings`. Completed results include `snapshot_id`. `POST /v1/insights/summary` accepts that ID and settings, loads the matching server-side snapshot, and returns the same quantitative/qualitative data with new narration. An expired snapshot returns 404; Refresh creates/reloads analysis. Invalid settings return 400.

## Storage and failure behavior

Successful generated results and base snapshots persist in `.ai-cache/generated-results.json`, with a bounded entry/file limit and owner-only file permissions where supported. Successful translations persist separately. Cache identities include relevant content, language/context/preferences and model/prompt/pipeline versions. Runtime caches are ignored by Git.

The app persists results and owner drafts using SQLite on native and browser storage on web. Suggestions and edits remain separate. Changing draft text or languages invalidates old translations. Wrong-snapshot responses are rejected. Model failure never alters counted findings or silently claims an authored template was generated.

Translation remains CPU-based in this build. Long first-time translations can take substantially longer than English Qwen drafting; saved language pairs are fast to reopen. Readiness/timeout states are visible, and drafts remain intact on failure. No measured accuracy claim is made for all roughly 200 supported NLLB languages.

## Evaluation

Run `npm run ai:evaluate` against the ready local backend. Thirty authored held-out smoke cases live in `ai/replies/cases.jsonl`, separate from the synthetic demo reviews. The runner saves outputs under ignored `.ai-cache/reply-evaluation.json` and reports distinctness, expected-term presence and latency. Those are heuristic checks, not a human-rated accuracy percentage.

Inspect meaning, tone, invented facts and editing effort manually, especially multilingual output and negation. Unit/API tests cover templates versus generated provenance, approval, input sanitization, duplicate/commitment rejection, persistent cache reuse, language failures, summary identity/preferences and review-order mapping. Frontend tests, typecheck, lint, backend tests and web export are required before release.

For a physical offline demonstration: preload everything, disconnect internet, create a new uncached reply and change summary preferences. Also stop model/backend services and verify that saved content remains accessible. A live local HTTP test with offline model flags is not equivalent to physically testing an iPhone in airplane mode.
