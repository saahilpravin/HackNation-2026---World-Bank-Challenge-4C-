# Lauda — local review insights and response translation

Lauda is a React Native / Expo SDK 57 business-owner workspace. Noor's Coffee Farm is the explicit sample business. The MVP connects the frontend from `codex/noor-ai-starter` to the versioned Java backend from `main`, preserving manual review responses and local NLLB translation.

## Run the MVP

Install Node dependencies (`npm ci`), Java 17+ and Maven. In the project root:

```sh
python3 scripts/setup-review-model.py
python3 scripts/start-review-ai.py
```

In another terminal, start the app:

```sh
npm run web
```

The frontend runs at http://localhost:8082 and the analysis API at http://127.0.0.1:8080. Open Insights to load findings automatically. Read supporting reviews, then write your own response and translate it.

For NLLB, follow [translation setup](ai/translation/README.md), then start the actual service (the evaluation runner is not the service):

```sh
.venv-ai/bin/python ai/translation/server.py
```

Translation defaults to http://127.0.0.1:8085. First setup downloads model assets; runtime uses the cached model. For a phone, set the reachable analysis/translation addresses in Offline & AI and keep the local network connection to your laptop. Fresh inference is performed on the laptop, not inside the phone.

## Offline laptop demonstration

Build while online, keep local services running, and serve exported assets:

```sh
npx expo export --platform web --output-dir dist
python3 scripts/serve-demo.py
```

Open http://localhost:8087. You can then disable internet and continue local analysis and translation with downloaded models. To restart Java without rebuilding/downloading, use `python3 scripts/start-review-ai.py --offline` after a successful build. Saved findings, translations, drafts and approved replies persist in native SQLite or browser localStorage. Replies are approved locally, not posted to external platforms.

## Implementation and validation

See [MVP payload mapping and integration plan](docs/MVP-INTEGRATION.md). The older [architecture review](docs/design/README.md) describes snapshots before this integration and is retained as historical context.

```sh
npm run typecheck
npm run lint
npm test
cd backend
mvn test
```

Large weights, Python environments and build outputs are excluded from Git. The app has Home, Reviews, Bookings, Insights and Help tabs. Review response generation is deliberately absent from the UI; the backend's reply-draft endpoint is retained but unused. Insights uses learned MiniLM classification and fixed, evidence-linked wording; it does not claim an LLM-generated summary or AI business score.

## Next integration plans

- [Review gauges, sentiment, example responses and dashboard payload mapping](docs/REVIEW-AND-INSIGHTS-INTEGRATION-PLAN.md)
- [Offline LLM preparation and Java backend integration](docs/OFFLINE-LLM-IMPLEMENTATION-PLAN.md)

Implemented integration and offline launch instructions: [Offline LLM runbook](docs/OFFLINE-LLM-RUNBOOK.md).

### Translation is included in this project

Run `npm run translate` from this folder. It installs missing Python dependencies and downloads the pinned NLLB model on first use, then runs locally. No separate GitHub repository is needed. Later use `npm run translate:offline` with internet disabled. See [translation setup](ai/translation/README.md) for Python prerequisites, phone connection and storage requirements.

See [Multilingual review insights](docs/MULTILINGUAL-INSIGHTS.md) for the local NLLB-to-classifier pipeline, batch progress, cache and offline operation.

The [visual review brief](docs/INSIGHT-VISUAL-DESIGN.md) maps the backend payload to the mobile charts and explains the local Qwen summary. After one-time setup, `npm run ai:llm`, `npm run translate:offline` and `npm run ai:backend` start the local AI services in separate terminals.
