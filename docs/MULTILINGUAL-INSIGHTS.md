# Multilingual review insights

## What changed

The old 13/150 count was not a loading limit. The classifier allowed only `en` and `sw`, then excluded reviews with no detected aspect. The new pipeline keeps the classifier operating on English inputs and translates non-English inputs locally with NLLB first. It does not relabel original French/Chinese/etc. reviews as English or remove the classifier's uncertainty checks.

All input reviews are processed. The final count distinguishes reviews included in findings from reviews needing human checking. Translated reviews can still have no aspect above threshold; those are excluded rather than given invented classifications. Review stars and total review count continue to use every input review.

## Data flow

1. The frontend sends original text, actual source language, rating, date and numeric batch IDs to `POST /v1/insights/jobs`. Missing source languages stay `unknown`.
2. `InsightsJobService` runs one local batch at a time, returning a job ID immediately. Repeated identical requests reuse the active job. Different concurrent batches receive a conflict response. Eight completed job records are retained in memory; restarting the backend clears jobs.
3. The frontend polls `GET /v1/insights/jobs/{id}` and displays `processed / total`, then the local-summary phase. Each poll has a short timeout; the batch is not constrained by one 180-second HTTP request.
4. `ReviewAnalysisService` passes English text to the classifier directly. For other languages, `ReviewTranslationService` calls loopback NLLB on port 8085 with `from` set to the source code and `to: en`.
5. NLLB resolves ISO aliases and all supported NLLB script codes against the same catalog shipped with the app. Traditional Chinese retains its script code.
6. A successful translation must have the expected NLLB model revision and source. Classification receives the translated text with analysis language English; the resulting record retains the original source language, text and ID.
7. `InsightService` aggregates eligible hits. English translated evidence and original review text travel together on quotes. Local Qwen summarizes those eligible findings afterward.
8. The frontend saves the complete insight result in SQLite/native or localStorage/web, including translation provenance on evidence quotes. Review-specific analysis and example templates use the same translation pipeline.

The UI's first pass can take many minutes for 135 uncached translations on a laptop CPU. The progress indicator is real backend completion, not a timer animation. Closing the screen stops polling but the batch continues on the laptop. Reopening the same corpus attaches to its active job. Refreshing after completion starts another batch using the saved translations.

## Files

- `backend/src/main/java/com/lauda/api/service/ReviewTranslationService.java`: pinned NLLB HTTP client and bounded persistent translation cache.
- `backend/src/main/java/com/lauda/api/service/ReviewAnalysisService.java`: English analysis adapter, provenance, failure handling.
- `backend/src/main/java/com/lauda/api/service/InsightsJobService.java`: asynchronous batch and progress.
- `backend/src/main/java/com/lauda/api/service/InsightService.java`: aggregate translated analysis and preserve original-language evidence.
- `backend/src/main/java/com/lauda/api/service/ReplyService.java`: examples use the same translated analysis; actual template language remains explicit.
- `backend/src/main/java/com/lauda/api/controller/ReviewController.java`: job endpoints and shared review analysis.
- `backend/src/main/java/com/lauda/api/dto/Dto.java`: translation, original quote, job and translated/failed counts.
- `ai/translation/run.py`: ISO/NLLB source-code resolver used by the server.
- `src/ai/insights-api.ts`: polling, progress, ID mapping and strict original-text/provenance decoding.
- `src/ai/review-api.ts`: review analysis translation metadata and new cache identity.
- `src/app/(tabs)/insights.tsx`: truthful counts, progress, original/English evidence and failure notice.
- `src/components/review-analysis.tsx`: translated-analysis and failure labels.

## Run

From the updated `work/lauda-mvp` checkout, keep both terminals running:

```sh
npm run translate:offline
```

```sh
python3 scripts/start-review-ai.py --offline --llm
```

Prepare NLLB once using `npm run translate` while online if model files are not installed. Build the updated backend jar before using `--offline`, using the Maven command in the project documentation or `python3 scripts/start-review-ai.py` once, then restart with `--offline --llm`. Re-export the frontend if serving `dist`:

```sh
npx expo export --platform web --output-dir dist
python3 scripts/serve-demo.py
```

Backend settings:

- `LAUDA_TRANSLATION_ENDPOINT`: defaults to `http://127.0.0.1:8085`; accepts only a loopback HTTP origin. No user request can select a remote translation destination.
- `LAUDA_TRANSLATION_CACHE`: defaults to `.ai-cache/insight-translations.json` under the repository working directory.

The translation client uses the local preview origin accepted by NLLB; there is no browser pairing token in a Java request. Phones communicate with the Java backend over a local connection. Java communicates with NLLB on that same laptop.

## Offline cache and failures

Up to 500 successful translations are keyed by SHA-256 of exact source text, source language and pinned model version. The cache is written atomically and restricted to owner access where supported. It contains private review translations, stays outside Git, and is loaded after backend restart. It is not a cache of authored English demo versions. No `canonicalEnglish` or authored fixture translation is substituted for model inference.

Cached translations can be analysed without NLLB running. Uncached translations require the local NLLB service but no internet. Unknown/unsupported languages, invalid provenance, busy service or connection failure produce a translation-failed record and exclude that review. Failures are not cached as successful translations. The dashboard reports their count and allows a later refresh.

Review-specific requests may wait behind a current local translation. The service processes translations serially to protect shared tokenizer/model state. On a translation service connection failure, a short circuit avoids hundreds of repeated immediate network attempts.

JSON additions are backward compatible for existing direct clients: `/v1/insights` still accepts the original request but can take a long time. The current app uses jobs. Additive `meta.translated` and `meta.translation_failed` count translation outcomes across all input reviews; they are not included-aspect counts. Quotes include `original_text` and `translation_model` when translated. `Analysis.translation` contains status, source language, model identity, original text, translated text and error. Original records in the app are never overwritten.

## Quality

All reviews being processed does not mean all have trustworthy tags. A translation can change meaning, and the existing aspect classifier still needs better training and evaluation. The dashboard preserves that distinction and links back to original reviews. This is a laptop-local pipeline, not an on-device phone model or a claim of equal accuracy in 200 languages.

## Verified full demo batch

On 2026-10-04, a live run processed all 150 original synthetic demo reviews: 15 English reviews and 135 non-English reviews translated by the local pinned NLLB model. There were zero translation failures. The classifier included 102 reviews with eligible aspects and flagged 48 for checking. These are measured inference outcomes on synthetic inputs, not live customer results or accuracy measurements.

The separate Qwen narrative returned `invalid-output` on this batch. Its paragraph was withheld; the counted findings remain available. Translation integration does not solve classifier quality or narrative validation.
