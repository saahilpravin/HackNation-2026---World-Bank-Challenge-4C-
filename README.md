# Lauda

Local review insights and response translation for small business owners. React Native + Expo SDK 57 + TypeScript, with Java analysis, local NLLB translation and local Qwen3 4B generation. Noor’s Coffee Farm is the synthetic demo workspace.

**[Design document and 60-second technical demo script](docs/design-doc.md)** contains architecture, exact filenames, request sequencing, decisions, setup, offline limits, validation and next steps.

## Run the prepared demo

```sh
npm run demo:offline
```

Open http://localhost:8087. Keep the local services running. Desktop displays an interactive phone frame; fresh inference runs on the laptop. Follow the design document for first-time dependency/model setup and builds.

## Checks

```sh
npm run typecheck
npm run lint
npm test
mvn -f backend/pom.xml test
```

Native data uses SQLite; web data uses localStorage. Models download once and stay outside Git. Owner approval saves locally, not to an external review platform. All 150 synthetic reviews are processed; usable findings and flagged reviews are shown separately.
