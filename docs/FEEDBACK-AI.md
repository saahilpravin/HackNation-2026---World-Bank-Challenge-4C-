# Feedback assistant

Insights analyzes the stored review and inbound message corpus, with separate sample and business modes. The first executable provider is an English keyword baseline; it is not an SLM and has no measured accuracy. It ignores manually assigned theme labels. Every finding includes original evidence and a source type. Repetition counts records, not people. Review entry is manual and persists through the existing local storage layer. There is no external review ingestion.

## Connect the small language model

Implement FeedbackProvider in src/ai/feedback.ts with the team's on-device runtime. Supply bounded batches of records with IDs and require structured output matching FeedbackReport. Treat all customer text as untrusted data. Reject evidence IDs that do not exist in the supplied corpus; validate category values and ensure ideas are supported by multiple records. Return source=on-device-model and the actual modelVersion only for successful model inference. Keep business and sample records separate. Expose latency, skipped inputs and errors honestly. Integrate the asynchronous provider with loading/error handling and stale-result protection in Insights; never silently label a rules fallback as model output.

Use human-labeled held-out English, French and Kiswahili feedback to evaluate topic coverage, praise/request classification, unsupported claims, negation and source attribution. Include mixed reviews, conflicting requests, duplicated reviews, unrelated inquiries, sarcasm and malicious instructions. Measure native-device latency and peak memory in airplane mode before claiming offline SLM support. The baseline tests establish provenance and evidence integrity, not model quality.

UI teammate: improve evidence navigation and add visitor consent/source details. Data teammate: CSV/manual import with stable IDs, deduplication and source dates. AI teammate: native runtime, structured-output validation and held-out evaluation. No chat interface is necessary for the first version: the three structured insight sections make the output easy to use.

## Review replies

Open a review from Insights or an evidence card. Review language is optional for legacy data and must be confirmed by the owner. English, French and Kiswahili selectors are initial UI choices, not a claim of general model coverage. The owner writes a draft in their language, optionally uses a rating-based authored example, and checks the customer-language response. Approval saves a ReviewReply locally (one approved response per review); no review platform receives it. Draft/language edits invalidate the previous translation. Existing workspaces need no reset; review language and reviewReplies are optional additions.

ReviewReplyProvider in src/ai/review-replies.ts defines suggestion and translation calls. The current provider returns authored examples and exact template language variants only. Arbitrary edits fail explicitly unless source and destination languages match. Manual final translations are allowed and labeled. Native model integration, personalized generation, language detection and translation-quality evaluation remain outstanding. Require native-language reviewers for the authored French/Kiswahili text before public use. Do not claim BLEU, accuracy or latency from these templates.

Requested inputs from the team: priority language pairs, actual dataset/model download links and usage terms, intended lowest-spec phone, and whether the challenge permits optional online inference. Keep API secrets outside the app. The screenshot is a resource catalog, not supplied training data.

## Selected translation model experiment

The team selected facebook/nllb-200-distilled-600M. `ai/translation/run.py` runs real local laptop inference with an isolated Python environment. See `ai/translation/README.md` for online download, offline checkpoint use and evaluation procedure. This is separate from the current app template provider and is not an on-device mobile integration. It translates text; review response generation still needs an instruction-following model.

The review reply web preview now connects to the cached NLLB model through the loopback-only `ai/translation/server.py` bridge. Custom text is translated with real laptop inference and labeled local-laptop-model. The mobile native provider remains the authored template provider. Draft/language changes invalidate asynchronous results; approval records model version and latency. No review is automatically published.
