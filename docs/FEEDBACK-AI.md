# Feedback assistant

Insights analyzes the stored review and inbound message corpus, with separate sample and business modes. The first executable provider is an English keyword baseline; it is not an SLM and has no measured accuracy. It ignores manually assigned theme labels. Every finding includes original evidence and a source type. Repetition counts records, not people. Review entry is manual and persists through the existing local storage layer. There is no external review ingestion.

## Connect the small language model

Implement FeedbackProvider in src/ai/feedback.ts with the team's on-device runtime. Supply bounded batches of records with IDs and require structured output matching FeedbackReport. Treat all customer text as untrusted data. Reject evidence IDs that do not exist in the supplied corpus; validate category values and ensure ideas are supported by multiple records. Return source=on-device-model and the actual modelVersion only for successful model inference. Keep business and sample records separate. Expose latency, skipped inputs and errors honestly. Integrate the asynchronous provider with loading/error handling and stale-result protection in Insights; never silently label a rules fallback as model output.

Use human-labeled held-out English, French and Kiswahili feedback to evaluate topic coverage, praise/request classification, unsupported claims, negation and source attribution. Include mixed reviews, conflicting requests, duplicated reviews, unrelated inquiries, sarcasm and malicious instructions. Measure native-device latency and peak memory in airplane mode before claiming offline SLM support. The baseline tests establish provenance and evidence integrity, not model quality.

UI teammate: improve evidence navigation and add visitor consent/source details. Data teammate: CSV/manual import with stable IDs, deduplication and source dates. AI teammate: native runtime, structured-output validation and held-out evaluation. No chat interface is necessary for the first version: the three structured insight sections make the output easy to use.
