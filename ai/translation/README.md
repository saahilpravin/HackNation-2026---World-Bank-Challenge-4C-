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
