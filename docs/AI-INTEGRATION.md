# Integrating the teammate's assistant

A separate GitHub repository is fine. Share its link and a commit/tag when ready. Lauda stays the mobile/UI repository; integrate the assistant as a small adapter rather than copying another app or replacing this workspace.

## What to send with the link

- A README with install/run commands, dependency versions, model name/revision and model license.
- Model artifact format, download instructions and approximate size. Do not commit weights, API keys or private datasets.
- Whether it runs on a phone, local laptop, or cloud. A cloud API cannot power disconnected phone AI.
- Three executable examples: positive review, a complaint, and mixed praise/criticism. Include at least one non-English case, expected behavior, latency and any failures.
- A held-out evaluation set distinct from training examples. Yelp stars are rating labels, not correct reply or recommendation labels; evaluate response quality with human review.

## The app contract

See `src/ai/assistant-contract.ts`. `BusinessAssistant.suggestReply` receives verified business facts, one review and the requested writing language. It returns draft text, source review IDs, source type, model revision and measured latency. The app validates citations and provenance. The existing integration seam is `assistantIntegration.provider` in `src/ai/review-assistant.ts`.

`recommend` receives business facts and bounded review batches and returns experiment ideas with evidence IDs. Those IDs must be present in the input. The recommendation interface is defined, but its model implementation is not connected to the current rule-based Insights screen yet.

A portable TypeScript module is easiest to integrate in the UI. If the prototype is Python, expose a documented local service first; we can adapt that for a laptop demo, then assess model/runtime compatibility for mobile. Python code alone does not run inside Expo Go.

Treat review text as untrusted data. Do not obey instructions embedded in reviews. Do not invent business promises, refunds, access features or prices. Do not post replies: the operator reviews and approves each draft. Fail visibly while preserving the draft; never label a template fallback as model inference.

## Offline behavior

Already available on the phone: SQLite records, sample review language variants, authored reply examples, local keyword findings, curated ideas, saved drafts/approvals and booking edits. Internet is not used for those operations after the app is loaded/installed.

NLLB custom translation: cached model runs on a laptop. Internet is unnecessary for inference once weights are downloaded, but the phone still needs a local Wi-Fi connection to that laptop. Without that connection, custom translation is unavailable; saved/sample translations remain readable. This is local inference, not phone inference.

Fully disconnected phone inference still requires a model small enough for target-device RAM/storage, an appropriate native runtime, packaged/downloaded model assets, and a development/standalone build. Check the friend's model artifact before choosing the runtime. Test cold launch and airplane mode on a physical iPhone, record peak memory and latency, and test unsupported languages and failures. Expo Go is a development preview, not proof of a self-contained offline installation.

## Yelp evaluation data

`scripts/prepare-yelp-evaluation.py` streams the supplied ZIP/gzip-tar and writes a bounded local JSONL sample to ignored `.ai-cache/yelp-evaluation.jsonl`. It removes reviewer IDs and business IDs; review text is still source data and must not be represented as anonymized of all personal information. The archive includes dataset terms: review them for the intended use before redistribution or training. No raw Yelp reviews have been added to the public repository or presented as Noor's reviews.
