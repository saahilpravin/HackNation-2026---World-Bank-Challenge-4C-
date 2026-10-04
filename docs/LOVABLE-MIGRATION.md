# Moving Lauda's web interface to Lovable

Prepared 2026-10-04. This guide prepares the migration; it does not deploy or replace the existing mobile app.

## What can move

Lauda currently has an Expo/React Native client, a Java review API, local Ollama Qwen, and local Python NLLB. Move the web interface and reuse the API contracts and pure TypeScript data helpers. Keep the model services as separate processes. Lovable hosting does not turn laptop inference into on-device phone inference or automatically host this Java/Python stack.

Lovable's current GitHub documentation says existing repositories cannot be imported directly: create a Lovable project and connect/export it to a new GitHub repository, then port the client into that linked repository. Its current hosting documentation says new projects use TanStack Start; older projects use React/Vite. Inspect the generated scaffold rather than replacing it with our Expo package.json.

Sources: [GitHub integration](https://docs.lovable.dev/integrations/github), [hosting and ownership](https://docs.lovable.dev/tips-tricks/deployment-hosting-ownership). These product capabilities can change; confirm in the project before proceeding.

## Recommended route

1. Keep this repository as the working native/local baseline. Record the integration commit before porting.
2. Create a new Lovable project named Lauda. Paste `docs/LOVABLE-STARTER-PROMPT.md`; include screenshots of the review brief, chart section and review response page as design references.
3. Connect the new project to the team's GitHub account using Lovable's Git integration. The new repository belongs to the web client; do not overwrite the existing app repository or backend.
4. Inspect the generated app framework. Retain its routing/build conventions. Copy the shared contracts and language catalog, then convert screens from React Native elements to accessible web components.
5. Implement the API adapter and local browser storage before connecting live generation. Use saved synthetic fixtures for development; label them clearly.
6. Run the Lovable-created web client locally on port 8088 so it matches the existing API/NLLB development-origin allowlists. Use the generated framework's supported port configuration.
7. Start Java on 8080, NLLB on 8085, and Ollama on 11434. Call Java/NLLB from browser-side code. Server-side code running on Lovable hosting cannot reach the user's laptop at localhost.
8. Verify real replies, summary settings, all review IDs, translations, owner edits and approval. Run the offline checklist below.
9. Publish a public preview only after selecting a hosted-data/API strategy. Keep the local offline demonstration as a distinct supported execution mode.

## Files to port and adapt

Paths below are relative to this repository.

| Existing file | Web-client use |
|---|---|
| `src/ai/review-api.ts` | Reply/analysis DTOs and validation. Preserve source metadata and approval checks. |
| `src/ai/insights-api.ts` | Batch jobs, summary snapshot endpoint, preference/cache keys and payload validation. |
| `src/ai/laptop-translation.ts` | Translation connection/provenance behavior; adapt endpoint configuration for the chosen deployment. |
| `src/ai/translation-cache.ts` | Exact-content/language cache matching. |
| `src/data/nllb-languages.json` | Searchable language dropdown catalog; do not claim all languages have been quality-tested. |
| `src/data/types.ts` | Reviews, owner drafts, approved replies, preferences and cache contracts. |
| `src/data/review-demo.ts` | Clearly labeled synthetic reviews, never fake live customer imports. |
| `src/data/storage.web.ts` | Starting browser persistence behavior; prefer IndexedDB for larger corpora in the new client. |
| `src/state/store.tsx` | Port serialized save queue and cached-first state loading. Remove React Native/Expo-specific imports. |
| `src/app/(tabs)/insights.tsx` | Rebuild review brief, summary settings, numeric charts and evidence cards in web components. |
| `src/components/feedback-graphics.tsx` | Recreate SVG charts with DOM SVG; keep exact numeric meanings and accessibility text. |
| `src/app/reviews/[id].tsx` | Rebuild review reading, generated examples, editor, NLLB translation and local approval. |
| `src/components/review-analysis.tsx` | Rebuild sentiment/aspect gauges and generation source labels. |
| `src/components/ui.tsx`, `src/components/studio.tsx` | Port design tokens and behavior, rather than importing native Views/Pressables. |

Do not copy Expo dependencies, Metro configuration, native build folders, model weights, `.venv-ai`, `.ai-cache`, or Maven caches into the Lovable client. Keep private state out of fixtures. Retain the native app separately if iPhone/Android packaging remains required.

## API contract to preserve

- `GET /v1/health`: classifier readiness and local model capabilities, including reply/summary prompt versions.
- `POST /v1/reviews/analyze`: original reviews -> sentiment/aspects and translation provenance.
- `POST /v1/reviews/reply-draft`: `review`, `owner_language`, `business_name`, optional `business_context` (`experience`, `hours`). Returns `analysis`, `drafts`, `generation`, `warnings`, `requires_approval: true`, classifier `model_version`.
- `POST /v1/insights/jobs`: `reviews`, `owner_language`, `include_narrative: true`, `settings`.
- `GET /v1/insights/jobs/{id}`: processed/total, completed result or failure.
- `POST /v1/insights/summary`: `snapshot_id`, `settings`; returns the same counts/charts plus updated narrative, without classifying every review again.
- NLLB `POST /translate`: `text`, `from`, `to`; returns actual model/version/latency. Preserve the existing pairing-token behavior where required.

Summary settings are `length: brief|standard`, `tone: plain|professional`, `focus: balanced|praise|concerns`, `language: model/ISO language code`. Numeric IDs in request payloads are mapped back to the current ordered app review list. Never render evidence from a different workspace or pair a summary with unrelated counts.

Reply generation source is distinct from translation source and classifier version. `generation.status=generated` with `source=local-laptop-llm` identifies a validated Qwen result. Other statuses use explicitly labeled authored template suggestions. An approved local response has not been posted to Yelp.

## Public preview versus local offline execution

### Local demonstration

Run the web client on localhost with the three cached services. Download dependencies and build beforehand; generate an uncached reply and new summary setting with internet disconnected. For a phone, use an isolated local network/hotspot that still connects it to the laptop. Fully disconnecting that phone permits cached content/manual drafts but not new laptop inference.

### Hosted preview

For the quickest submission preview, ship the labeled synthetic review corpus and example saved results. Explain that these are saved demonstrations. Public users cannot access your laptop simply because the app contains `localhost:8080`: localhost refers to their own machine.

For live hosted generation, operate a separately deployed authenticated HTTPS backend that can run the models, or provide an explicitly installed local companion. This requires deployment work beyond a UI migration. Internet-connected hosted inference should not be described as offline laptop inference.

Do not assume an HTTPS Lovable page can fetch local cleartext HTTP. Browser mixed-content/private-network permission rules and the current origin allowlists can block it. Prefer the local client at an allowed origin for the offline demo. A hosted integration requires deliberate HTTPS, authentication and exact-origin configuration for both Java and NLLB; do not use a wildcard to expose local services.

## Browser offline requirements

A published page is not automatically an offline PWA. Implement:
- Service-worker caching for the app shell, bundled fonts, SVG/assets and route fallback, appropriate to the generated scaffold.
- IndexedDB for reviews, snapshots, generated suggestions, settings and owner edits; retain schema/version migration.
- Network-first API requests with cached fallback; do not store API responses indiscriminately in a shared public asset cache.
- Explicit saved/generated/template/stale states, and last-updated timestamps.
- No CDN fonts, remote images or cloud AI dependencies on the core offline path.

For a new TanStack Start scaffold, determine which routes require server execution and make the offline workspace client-renderable. Copying a static-export recipe from an older Vite project will not necessarily work.

## Acceptance checklist before publishing

- 150 demo reviews remain present; processed count and usable-aspect count are distinguished.
- Short/detailed replies differ, address the visitor, and remain editable.
- Template fallback is never labeled generated.
- Editing does not get overwritten by background work; language changes invalidate old translations.
- Summary preferences regenerate narration from the matching snapshot; failed regeneration preserves the last valid summary.
- Ratings/counts/charts are backend facts, not invented LLM scores.
- Language dropdown searches and scrolls on a narrow phone viewport.
- Saved reviews/drafts/results survive reload and local model/service restart.
- First load, timeout, busy, unavailable and translation-failure states are understandable.
- Local internet-disconnected test produces an uncached result; completely disconnected phone behavior is described accurately.
- Public links contain no private review data, secrets, runtime caches or model weights.
