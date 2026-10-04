# Lauda: local review intelligence and small language model

The integration branch combines the mobile work with the backend on main. It preserves the existing NLLB translation service, demo records, approvals and SQLite storage. Five current tabs are Home, Reviews, Bookings, Insights and Help.

## What runs where

| Component | Runtime | Role |
|---|---|---|
| React Native / Expo / TypeScript | Phone or browser | Review desk, approvals, bookings, model evidence |
| SQLite | Native phone | Local workspace and saved AI results |
| localStorage | Browser | Same local workspace snapshot |
| MiniLM multilingual encoder + trained head v1 | Java Spring Boot on laptop, ONNX Runtime | Original review text → category, sentiment, score, verification flag |
| Qwen3 `qwen3:0.6b` (Q4_K_M) | Local Ollama on laptop | Up to three suggestions from measured concerns and short review excerpts |
| NLLB distilled 600M | Existing Python laptop service | Translation, separate from review analysis |

MiniLM is a classifier, not a generative LLM. Qwen is the generative small language model. Its tag is 0.6b; the current Ollama artifact reports approximately 752M total parameters and is about 523 MB. The downloaded MiniLM encoder is approximately 470 MB. Neither model is committed to Git. Model runtime services bind only to this laptop. There is no hosted AI API in the new review pipeline.

Figma is a design/prototype tool; it does not run this code or local inference. For the working submission demo, use the browser at a phone-sized viewport. A real phone still runs the Expo UI and retains cached data; fresh review analysis in this integration is for the laptop browser. Running inference directly on an iPhone needs a separate native runtime/build, memory tests and model conversion.

## First setup while online

Requirements: Python 3.11+, Java 17+, Maven, Node compatible with Expo SDK 57, and Ollama from its official distribution: https://ollama.com/download. Use your team's integration checkout.

```sh
npm ci
python3 scripts/setup-review-model.py
python3 scripts/start-review-ai.py
```

The last command builds the Java service and leaves it running at `http://localhost:8080`. It uses a project-local Maven dependency cache. Model weights are pinned to Hugging Face revision `e8f8c211226b894fcb81acc59f3b34ba3efd5f42` and SHA-256 verified. Stop with Ctrl+C after the first build if preparing the offline demo.

In another terminal:

```sh
python3 scripts/start-small-llm.py --setup
```

This starts local Ollama and downloads Qwen into the ignored project cache. Leave the terminal running. If you already have Ollama running, stop that instance first so the project launcher can use port 11434. No cloud model is used. On this prepared Mac, a project-local official Ollama binary is already available; teammates can use their installed Ollama.

Export the app once:

```sh
npx expo export --platform web --output-dir dist
python3 scripts/serve-demo.py
```

Open `http://localhost:8087`. Choose Noor's explicitly labelled sample workspace, then Insights. It automatically analyzes each new review corpus once. The manual Analyze reviews button retries a failed connection or regenerates ideas. Measured category counts, source/version, latency and evidence links replace keyword examples. Suggested improvements separates Qwen-generated ideas from curated recommendations.

## Run with Wi-Fi off

After the initial downloads and build, keep or start these three local processes:

```sh
# Terminal 1
python3 scripts/start-small-llm.py
# Terminal 2
python3 scripts/start-review-ai.py --offline
# Terminal 3
python3 scripts/serve-demo.py
```

Then open `http://localhost:8087` on the same laptop. Turning Wi-Fi off does not break localhost. Do not use a cloud Figma presentation as proof that AI runs offline. Show a new analysis while offline, open a supporting review, and explain that the models run on the laptop. Saved findings remain visible even after the AI services stop. A page reload still needs the local web server; this is not a service-worker PWA.

NLLB requires its separately prepared Python environment and weights. See the existing translation instructions. Turning Wi-Fi off disconnects a physical phone from the laptop's LAN bridge; the laptop browser can still call local services. Do not claim fresh on-phone inference or fresh translation in airplane mode.

## Contract and data flow

`POST /workspace/analyze` receives `{reviews:[{id,text,language,rating}]}`. IDs are strings, including imported Yelp IDs. Maximum 300 reviews; each text is at most 4,000 characters. The backend validates the entire request before inference. It classifies original text, builds deterministic summaries, and optionally asks Qwen for ideas. The backend assigns idea evidence IDs from the classifier; it never trusts generated IDs. LLM failures retain classifier results and fixed suggestions.

The mobile client rejects foreign/duplicate review IDs, unknown categories, invalid scores and evidence that does not belong to the submitted corpus. It saves a fingerprint of IDs, original text, language and rating with the result. Changed reviews invalidate that cache. Creating a new business clears prior analysis. Approved responses remain local and are not published to Yelp or another platform.

Backend APIs from the teammate remain available (`/analyze`, `/analyze/batch`, `/insights`, `/health`). Browser CORS is limited to the listed localhost development origins, including 8087. The review service binds to 127.0.0.1; it is not exposed to public or LAN clients by default.

## Quality limits to explain to judges

- The 150 demo reviews are synthetic examples, not Yelp customers or measured research results. Their current model outputs are real inference on synthetic inputs.
- The head has only been evaluated for English and Kiswahili. A multilingual encoder does not establish quality for every language. Other languages require verification.
- The classifier reads at most 128 tokens. Model scores are not accuracy measurements. Conflicting positive/negative labels for the same category are explicitly flagged for review.
- This first head can misclassify obvious examples. Validate on a held-out tourism set before showing business recommendations as reliable. Recorded validation F1 is not a production accuracy claim.
- Qwen ideas are generated proposals, not verified findings. Review the source feedback and suggestions before acting.
- The model currently recognizes eight trained aspects: guide, coffee tasting, value, communication, facilities, transport, food and other. Additional UI categories do not imply trained model capability.

## Three-person ownership

1. **AI/model teammate:** Improve the labelled tourism data, reconcile training labels with the exported head, evaluate English/Kiswahili and target languages, recalibrate contradictory predictions, and benchmark Qwen output quality. Update weights/head together and extend the existing Python/Java parity fixture.
2. **Mobile/UI teammate:** Own review imports, review details, response approval, accessibility and demo presentation. Keep source/verification labels visible. The response-drafting adapter remains separate from these insight ideas, so a later teammate reply generator can be integrated without replacing the UI.
3. **Offline/data teammate:** Own SQLite snapshot migrations, provenance, cache invalidation, import limits and runtime packaging. Add a separate authenticated LAN mode only if a physical phone must perform fresh laptop inference. Investigate native ONNX/LLM deployment independently rather than promising Expo Go can load arbitrary native models.

## Checks

```sh
npm run typecheck
npm run lint
npm test
mvn -f backend/pom.xml -Dmaven.repo.local=.maven-cache test
```

Backend tests include request bounds, string-ID/evidence preservation, generated-evidence validation and the teammate's Python/Java probability parity test. Live testing also exercises `/workspace/analyze` with the real models and the browser workflow. Model downloads, caches and runtime files remain ignored.
