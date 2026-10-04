# Built-in NLLB translation service

Lauda includes the language catalog, translation code, pinned model manifest, model installer and laptop service in this repository. Users do **not** clone FLORES, Fairseq or another GitHub repository to translate.

From the Lauda project folder:

```sh
npm run translate
```

On first use, the launcher creates `.venv-ai`, installs the pinned Python dependencies, downloads `facebook/nllb-200-distilled-600M` from its pinned Hugging Face revision, and writes `.ai-cache/local-nllb`. Then it starts translation at `http://127.0.0.1:8085`. Keep the terminal running alongside the app.

Prerequisites: Node/npm and Python 3.10–3.12 (3.12 recommended). First use requires internet and approximately 5 GB of free disk space for the model hub cache plus local checkpoint. Large weights are downloaded by code rather than checked into Git. No visitor text is sent to Hugging Face; the download retrieves model files only.

After setup:

```sh
npm run translate:offline
```

This refuses to install/download anything missing. Runtime inference loads local files only. A running compatible loopback service is reused. To prepare without starting the service:

```sh
npm run translate:setup
```

The web app defaults to port 8085 for translation. A native phone must use the laptop's private LAN address in Offline & AI. To start a private LAN bridge, pass a specific private address:

```sh
npm run translate -- --bind 192.168.1.20 --port 8086
```

The service prints a temporary pairing code for that bridge. Phone and laptop need a local connection; internet can be disconnected. This remains laptop inference, not a model embedded inside Expo Go.

## Implementation

- `scripts/start-translation.py`: environment setup, dependency installation when needed, offline flag, reuse/start service.
- `ai/translation/prepare.py`: pinned download and atomic checkpoint preparation; preserves incompatible existing checkpoints.
- `ai/translation/model-manifest.json`: model identity and exact revision.
- `ai/translation/server.py`: local inference, request limits, browser origin checks and mobile pairing.
- `ai/translation/run.py`: optional smoke-test runner using the same installer/checkpoint.
- `src/data/nllb-languages.json`: shipped NLLB language/script variants used by the searchable UI and server.
- `src/ai/laptop-translation.ts`: frontend adapter.

NLLB translation coverage and review-classifier coverage are separate. The classifier's `ml/common.py` and exported `ml/artifacts/head_v1.json` currently list only `en` and `sw`. Simply removing that guard does not prove reliable analysis. The backend now translates non-English reviews into English with local NLLB before classification, preserving source language and original text. Successful translations are cached on disk. Translation failures and reviews with no aspect above threshold are still excluded; translation support is not a claim of classifier accuracy.

## Quality and license

Language selection does not guarantee equal translation quality. Check names, numbers, negation and meaning. Inputs are split into sentences; a sentence exceeding 512 tokens is rejected instead of truncated. `cases.jsonl` contains authored smoke tests, not a FLORES benchmark.

The [official model card](https://huggingface.co/facebook/nllb-200-distilled-600M) specifies CC-BY-NC-4.0 and research use rather than production deployment. This integration supports the hackathon prototype; choose appropriately licensed models before commercial deployment.

Run checks:

```sh
python3 -m unittest discover -s ai/translation -p 'test_*.py' -v
```
