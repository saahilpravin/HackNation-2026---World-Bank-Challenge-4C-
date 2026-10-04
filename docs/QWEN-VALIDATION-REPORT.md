# Local Qwen validation — 4 October 2026

## Verified implementation

Qwen3 4B Q4_K_M generates review-specific short/detailed ideas and customized Insights narration. Model digest: `359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7`. The smaller 0.6B model was rejected after wrong-speaker and complaint-reversal outputs were observed. Prompts are `reply-v4-grounded` and `insights-v4-customized`.

## Checks and observations

- 45 frontend tests passed; TypeScript and lint passed; production web export succeeded.
- 19 backend tests passed, including persistent cache, generation provenance, fallback, approval, prompt validation and summary customization.
- 30 separate authored reply smoke cases generated two distinct drafts each. All contained an expected topic term. These are heuristic checks, not 100% semantic accuracy. Manually inspected cases included complaints, negation, accessibility, waits and injected review instructions. Median request time was 2.02 seconds; p95 was 4.45 seconds on this laptop.
- All 150 synthetic demo reviews processed: 102 usable aspect findings, 48 flagged for human checking, 135 translated, zero translation failures. Synthetic variants are not 150 independent real observations.
- Real summary requests produced a two-sentence qualitative brief and a four-sentence concerns-first standard summary. Java added exact count/rating context separately. Summary changes preserved quantitative data and metadata exactly.
- French summary localization succeeded in 32.23 seconds. Two French owner-language reply drafts succeeded in 28.14 seconds and still required approval. Translation wording needs human review; quality across all supported languages has not been measured.
- After restarting Java, the same French drafts loaded in 0.10 seconds and the three tested summaries in 0.07 seconds or less, demonstrating disk-cache reuse. Original generation timing remains in provenance; HTTP cache timing is distinct.
- Browser checks verified customization, preserved overview during regeneration, generated response controls and the 150-review count at a phone-sized viewport.

## Offline boundary and remaining release checks

Models ran through local services with cached-only/offline launch flags. No physical Wi-Fi-off or native iPhone airplane-mode test was performed in this run. New inference requires the laptop services running. Saved app data remains local; a disconnected phone cannot call a disconnected laptop. Model output can still misstate sentiment or evidence. Human editing and approval remain mandatory.

Before submission, perform the physical offline checklist in `LOCAL-QWEN-IMPLEMENTATION.md`, review multilingual output with speakers, measure classifier precision/recall on labeled real reviews, and record the demo using prepared local assets. A Lovable-hosted website cannot directly host these local model processes.
