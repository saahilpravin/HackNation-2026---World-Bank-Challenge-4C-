# NLLB translation experiment

Selected model: https://huggingface.co/facebook/nllb-200-distilled-600M
Official usage: https://huggingface.co/docs/transformers/model_doc/nllb

This runs real translation locally on a laptop CPU. It does not connect a server or model to the Expo application, and it does not generate review responses or summarize reviews. The app continues to label its template provider honestly.

From the repository root (Python 3.12 recommended):

```sh
python3.12 -m venv .venv-ai
.venv-ai/bin/python -m pip install -r ai/translation/requirements.txt
HF_HOME="$PWD/.ai-cache" HF_XET_CACHE="$PWD/.ai-cache/xet" .venv-ai/bin/python ai/translation/run.py
```

The first run downloads model files from Hugging Face; expect about 5 GB for the downloaded weights plus a self-contained local checkpoint. Subsequent runs can require a completely local cache:

```sh
HF_HOME="$PWD/.ai-cache" HF_HUB_OFFLINE=1 .venv-ai/bin/python ai/translation/run.py --offline
```

Output: `ai/translation/results/latest.json`, including the resolved model commit, environment versions, initial download/checkpoint preparation or offline load time and per-case inference time. Copy the commit hash into `--revision` for repeatability. Weights, environment, and local results are ignored by Git. Use `requirements.lock.txt` to recreate the measured environment.

`cases.jsonl` is a set of authored smoke-test inputs. Add JSON lines containing id, from, to and text. Supported first-stage language names are English, French and Kiswahili. The runner splits on simple sentence boundaries and translates each segment independently; abbreviations and paragraph formatting need review. Sentences over 512 tokens fail rather than silently dropping text. These cases have no professional reference translations, so successful execution is not an accuracy result. Have a bilingual reviewer check meaning, names, numbers, negation and politeness. Do not use back-translation as the only quality test.

For FLORES evaluation, keep corresponding lines from eng_Latn, fra_Latn and swh_Latn aligned within the same published split. Compare model outputs against the target references using chrF++, with corpus version, split, language direction and metric signature recorded. Do not train on the held-out evaluation split. Download the dataset separately with its citation/license. These smoke tests do not claim to be FLORES examples.

Before native integration: convert/quantize with a supported encoder-decoder runtime and verify tokenizer/language IDs; check translation fidelity after conversion; measure RAM, cold load, inference, model storage and battery on the actual target phone in airplane mode. Python dependencies cannot be bundled directly into Expo Go. Implement a native translation adapter only after those checks. A laptop-backed development server would need to be labeled laptop inference, never on-device/offline-phone AI.

The model card lists CC-BY-NC 4.0 and describes research use rather than production deployment. Revisit licensing/model choice before commercial release.

Checks:

```sh
python3.12 -m unittest discover -s ai/translation -p 'test_*.py'
```

## Connected web preview

After creating the local checkpoint, start the bridge from the repository root:

```sh
HF_HOME="$PWD/.ai-cache" HF_HUB_OFFLINE=1 .venv-ai/bin/python ai/translation/server.py
```

Keep this terminal running, then open the Expo web preview on localhost:8082 or localhost:8084. Open Insights → a review → write your response → choose the customer's language → Translate. The web client calls 127.0.0.1:8085. Inference stays on the laptop, uses cached weights only, and requires no cloud API key. The bridge binds only to loopback, permits only those preview origins, limits input sizes, and serializes inference requests. It does not log draft text. An unavailable service returns an error; it never silently substitutes a template for model output.

The review reply page records laptop-model provenance and inference latency on approval. Replies are saved locally, not published. Mobile native builds continue to use explicit template translation because an in-app NLLB runtime is not installed. The localhost bridge cannot be reached from a separate phone and is not a phone-offline feature. Personalized reply suggestions still use authored examples: NLLB is a translator, not an instruction model.

## Mobile app connection over Wi-Fi

The native review composer now uses the saved translationEndpoint plus an in-memory pairing code to call NLLB. With no saved endpoint it still labels its template fallback. Configure Offline & AI → Connect mobile translation. Test and save a successful connection; then open a review and translate. Language/draft edits still invalidate the response. Pairing codes are not stored in SQLite, browser storage or Git; re-enter after restarting the app.

Start a separate mobile bridge on the laptop's specific private Wi-Fi IP (shown in macOS network settings):

```sh
HF_HOME="$PWD/.ai-cache" HF_HUB_OFFLINE=1 .venv-ai/bin/python ai/translation/server.py --bind YOUR_PRIVATE_WIFI_IP --port 8086
```

Enter the printed address and pairing code into the phone. Both devices must be on a network that permits peer connections; guest Wi-Fi isolation or the Mac firewall can prevent connection. The service generates a new code each restart and rejects native requests without it. Browser requests from unrelated origins remain blocked. Do not bind to 0.0.0.0 or expose the service to the public internet.

HTTP on trusted local Wi-Fi is a development/demo connection and is not encrypted. Installed iOS/Android builds may block HTTP by platform policy. For those builds use a certificate trusted by the phone, with `--cert certificate.pem --key private-key.pem`, and enter the HTTPS address. Do not disable global transport security to bypass this. Allow the iOS local-network prompt if shown. Expo Go networking must be verified on the actual phone; exports alone cannot prove it works.

This is laptop-hosted translation, not an offline model installed in the phone. Native phone testing is pending. Offline data and local reply approval continue to work without the bridge.
