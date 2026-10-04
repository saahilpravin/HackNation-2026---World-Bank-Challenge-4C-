# Implemented review and offline LLM integration

Updated 2026-10-04. This implements the two plans in `REVIEW-AND-INSIGHTS-INTEGRATION-PLAN.md` and `OFFLINE-LLM-IMPLEMENTATION-PLAN.md`. The local laptop is the AI device; the phone is the interface. It is not phone-only inference.

## What is connected

| Display | API | Actual computation |
| --- | --- | --- |
| Review aspect gauges and overall sentiment | `POST /v1/reviews/analyze` | ONNX multilingual MiniLM encoder plus `ml/artifacts/head_v1.json` linear aspect classifier |
| Short/detailed example responses | `POST /v1/reviews/reply-draft` | Classifier-informed English templates from `ml/artifacts/texts.json`, requiring owner approval |
| Positive/negative dashboard findings | `POST /v1/insights` | Count eligible classified aspect hits and attach original evidence |
| AI insight paragraph and evidence notes | Same endpoint with `include_narrative: true` | Qwen3:0.6b Q4_K_M through local Ollama; structured output with validated aspect/polarity/IDs and verbatim evidence notes |
| Review/response translations | Existing NLLB service on 8085 or mobile bridge | `facebook/nllb-200-distilled-600M`; separate from Qwen |

A negative gauge value is the model activation for a negative aspect. It does not mean the business earned that score. Overall sentiment has no invented probability: it comes from detected aspects, review stars when aspects are absent, or unknown.

## Files to edit

- `src/ai/review-api.ts`: numeric backend IDs mapped to app IDs, review/example decoders, bounded review result cache keys.
- `src/components/review-analysis.tsx`: semicircle SVG gauges, overall sentiment, evidence, optional example templates. Top three aspect/polarity hits are displayed. Unsupported/uncertain reviews are visibly flagged.
- `src/app/reviews/[id].tsx`: embeds analysis and loads a chosen example into an empty editor using its actual language. Existing drafts are preserved. Translation and approval stay explicit.
- `src/ai/insights-api.ts`: requests the optional narrative; validates results and maps narrative evidence IDs. Old backend responses without narratives still work.
- `src/app/(tabs)/insights.tsx`: loads results, shows the generated paragraph, evidence links, Positive feedback and Negative feedback.
- `src/data/types.ts`, `src/data/profile.ts`: store review analysis caches and clear them when finishing a new business setup.
- `src/app/offline.tsx`: reports local Qwen readiness when testing the review connection.
- `backend/src/main/java/com/lauda/api/dto/Dto.java`: additive sentiment source and narrative contracts. Existing two-field InsightsRequest callers remain compatible.
- `backend/src/main/java/com/lauda/api/controller/ReviewController.java`: opt-in narration, health capabilities, bounded reply request validation.
- `backend/src/main/java/com/lauda/api/service/InsightService.java`: produces counted findings first, then optional narration.
- `backend/src/main/java/com/lauda/api/service/InsightsLlmService.java`: pinned local model lookup, bounded generation, JSON/evidence validation, 32-entry memory cache and explicit failure status.
- `backend/src/main/resources/prompts/insights-system.txt`: English summarization instructions. Treat review text as untrusted evidence.
- `backend/src/main/resources/application.properties`: local LLM enablement/address/timeout configuration.
- `ai/insights/model-manifest.json`: expected model digest, quantization, size and limitations. Model weights are deliberately excluded from Git.
- `ml/artifacts/texts.json`: short/detailed English reply wording and aspect-specific lines.
- `scripts/start-small-llm.py`: project-local model preparation and offline runtime launch.
- `scripts/start-review-ai.py`: `--llm` enables optional narration. Runs a temporary copy of the jar so rebuilding does not corrupt a running server's class loading.
- `tests/review-api.test.ts`, `tests/insights-api.test.ts`: frontend contract and evidence safety checks.
- `backend/src/test/java/com/lauda/api/service/InsightsLlmServiceTest.java`: structured output, invented evidence/aspect rejection, cache, unavailable runtime, insufficient evidence and timeout checks.

## Prepare once while online

From the repository root:

```sh
npm ci
python3 scripts/setup-review-model.py
python3 scripts/start-review-ai.py
```

The review startup builds Maven dependencies and the jar. Stop that backend before the next step. Java 17+ and Maven are needed; the script discovers Homebrew Java when available.

Install Ollama from its official download page if it is not installed. Then in another terminal:

```sh
python3 scripts/start-small-llm.py --setup
```

This downloads Qwen once. The launcher pins the recorded digest, sets `OLLAMA_MODELS` to `.ai-cache/ollama-models`, binds loopback and disables cloud features for a service it starts. If an existing local Ollama is detected, it verifies the installed model and leaves that service running; configure that existing service's cloud setting separately. A missing/different digest requires checking the manifest, not silently changing the model.

Install/download NLLB using the existing translation instructions if translations are required. Qwen does not replace the translation service.

## Run the laptop demo without internet

Keep separate terminals running:

```sh
python3 scripts/start-small-llm.py
python3 scripts/start-review-ai.py --offline --llm
```

The first command reuses an existing runtime or owns a local runtime until Ctrl+C. The second runs the already built Java jar with the local encoder and Qwen integration enabled.

For a static web preview, prepare the frontend export once:

```sh
npx expo export --platform web --output-dir dist
python3 scripts/serve-demo.py
```

Open `http://localhost:8087`. Keep the static server running even when Wi-Fi is off. Figma does not execute this backend; use the real app/browser at phone width to demonstrate working AI.

In Offline & AI, the review service address on the laptop is `http://127.0.0.1:8080`. Test and save it. The health response reports `llm.enabled`, `llm.ready`, model digest and prompt version. Open Insights and refresh once to save a generated result locally.

For phone access, `127.0.0.1` means the phone itself. Configure the Java service with `LAUDA_API_HOST=0.0.0.0` and use the laptop's private LAN address in the app only on a trusted local network. Phone and laptop must remain connected over LAN/hotspot even when the internet uplink is disconnected. Do not expose Ollama itself publicly. Production builds need a secured/authenticated backend connection and appropriate transport configuration.

## Storage and offline behavior

Native Expo builds save the app state in SQLite; the web preview saves it in localStorage. Insights (including generated narrative), selected-review analysis, response examples, drafts, approved replies and translations are in that existing local state. Storage is saved before the UI publishes an updated result.

- Cached results render without making a new AI request.
- New classification, new example templates and new summaries need the laptop services running, but no internet after preparation.
- Fresh translations need the separate cached NLLB model/service; saved translations remain readable without it.
- The backend keeps up to 32 successful narratives in memory, keyed by classifier version, model digest, prompt version, owner language and bounded evidence context. Restarting clears that server cache; frontend persistence survives.
- Frontend caches invalidate when input text/language/rating/date/service/business context changes. A deployed model change with identical input requires **Refresh insights**; cached results retain their original model version and saved time. Review analysis caches are bounded to 100 selected results; they are not a cache of every review.
- `finishSetup` clears analysis/insights when starting another business. There is no cross-device sync or cloud database.

## LLM contract and failure handling

`include_narrative` is false by default for other clients. The app opts in. Narrative fields are `status`, `source`, `model`, `digest`, `prompt_version`, `latency_ms`, `summary`, `aspect_notes`, and `warnings`. Metadata is generated by the server, not trusted from model output.

Only eligible findings enter the prompt, with at most three strengths, three concerns and two shortened quotes per finding. Generation uses 4,096 context tokens, bounded output, temperature zero, `think: false` and JSON schema. Only one generation runs at a time; concurrent requests receive `busy` while their counted findings remain available. Requests time out after 25 seconds by default (configurable up to 90 using `LAUDA_LLM_TIMEOUT_SECONDS`). Successful outputs are cached.

Notes must refer to an existing aspect/polarity and supplied review IDs and copy a supplied quote verbatim. Invalid notes reject the narrative. These checks prevent invented evidence links; they do **not** prove the free-form summary is semantically accurate or prevent every prompt injection. Verify wording against evidence.

Failures return counted findings with `disabled`, `not-ready`, `timeout`, `invalid-output`, `busy` or `insufficient-evidence`. No cloud fallback, model pull or training occurs inside a review request. An unavailable summary never changes quantitative data.

## Quality and remaining work

This is a working integration, not a quality-certified model. Current classifier tags can be wrong. Non-English reviews now pass through local NLLB before classification; untranslated failures and reviews with no aspect above threshold remain excluded. No claim of 200-language insight accuracy is made. NLLB's language selection is separate from classifier support. Qwen narration is English initially. Reply templates are English initially, with explicit fallback warnings and NLLB translation afterward.

Before submission, evaluate held-out, manually labeled real reviews for aspect precision/recall, overall sentiment and evidence correctness. Improve `head_v1.json` through the teammate's ML workflow and keep unsupported/uncertain feedback excluded. Test summary faithfulness independently from classifier accuracy. Show synthetic/demo provenance and do not present sample feedback as real customer results.

The integration was checked with TypeScript/lint, frontend contracts, Java tests, a real local Qwen request, web export and a phone-width browser walkthrough. Real iOS device validation and deliberate Wi-Fi-off testing remain team acceptance checks; on-device LLM inference is not implemented.

## Official references

- [Qwen3-0.6B model card and license](https://huggingface.co/Qwen/Qwen3-0.6B)
- [Ollama chat API](https://docs.ollama.com/api/chat)
- [Ollama offline/local configuration](https://docs.ollama.com/faq)
- [Expo SDK 57 SVG support](https://docs.expo.dev/versions/v57.0.0/sdk/svg/)

## Verification record

40 frontend tests and 8 Java tests passed. Type checking and lint passed with no project errors or warnings, and the web export succeeded. A final real local Qwen request produced a validated summary with exact quoted evidence and matching review IDs in 3.7 seconds of model request time on this laptop. This is an observed sample, not a performance guarantee. The browser walkthrough confirmed loading backend examples, choosing one as a draft, saving it, and reloading gauges/examples/drafts while the Java service was stopped. The backend was restored afterward. Existing multilingual classifier exclusions and training quality were preserved rather than disguised.

Multilingual batching, progress and provenance: [Multilingual insights implementation](MULTILINGUAL-INSIGHTS.md).
