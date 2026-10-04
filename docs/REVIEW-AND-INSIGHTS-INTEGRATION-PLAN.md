# Review and Insights payload integration plan

Status: planning only; no screen or backend implementation is changed by this document. Based on the merged MVP at `c8b76d3`. Existing and proposed filenames are distinguished below.

## 1. Requested experience

Each review detail screen will show:

1. The original review and existing language/translation controls.
2. A compact overall-sentiment badge.
3. Up to three relevant aspect gauges, with numeric model scores and supporting evidence.
4. An optional example-response section using the backend's short/detailed drafts.
5. The owner's editable response, translation and explicit local approval.

The Insights dashboard will show an overview followed by **Positive feedback** and **Negative feedback** sections. Each section identifies specific aspects and provides counts and evidence links. Preserve the restrained mobile layout; do not restore the large keyword-category grid.

This plan treats the latest request for example responses as a proposed addition to the currently manual-only screen. Existing backend drafts are authored templates, not LLM-generated responses. The offline LLM described in the [separate plan](OFFLINE-LLM-IMPLEMENTATION-PLAN.md) initially serves Insights, not reply generation.

## 2. Payloads that already exist

All Java records are defined in `backend/src/main/java/com/lauda/api/dto/Dto.java`; routes are in `backend/src/main/java/com/lauda/api/controller/ReviewController.java`.

| Endpoint | Request | Existing response | Planned use |
| --- | --- | --- | --- |
| `POST /v1/reviews/analyze` | `{reviews: [{id, text, language, rating, date}]}` | Array of `Analysis` | Automatically analyze the selected review on opening it. |
| `POST /v1/reviews/reply-draft` | `{review, owner_language, business_name}` | `ReplyResponse` with `analysis`, `drafts`, `warnings`, `requires_approval`, `model_version` | Load examples only when requested; reuse its returned analysis. |
| `POST /v1/insights` | `{owner_language, reviews}` | `meta`, `quantitative`, `qualitative`, `attention` | Dashboard's positive/negative aspects and supporting reviews. |
| `GET /v1/health` | None | `status`, `model_ready` | Service readiness. |
| NLLB `POST /translate` | `{text, from, to}` using UI language names | `text`, `source`, `modelVersion`, `latencyMs` | Existing review reading and owner-response translation. |

Java review IDs are numeric; UI IDs are strings. Preserve the existing request-local mapping pattern in `src/ai/insights-api.ts`. For a single review use numeric ID `1`, and accept only `review_id: 1` before mapping back to the original UI ID. Never navigate using the raw backend ID.

## 3. Review analysis mapping

Example shape, with illustrative values rather than evaluation claims:

```json
{
  "review_id": 1,
  "language": "en",
  "rating": 4,
  "date": "2026-10-03",
  "aspects": [
    {"aspect": "guide", "sentiment": "positive", "score": 0.84, "evidence": "The guide explained everything clearly."},
    {"aspect": "facilities", "sentiment": "negative", "score": 0.76, "evidence": "The toilets needed cleaning."}
  ],
  "overall_sentiment": "mixed",
  "needs_review": false,
  "model_version": "v1@head-content-hash"
}
```

| Field | Screen display | Rule |
| --- | --- | --- |
| `overall_sentiment` | Positive / Negative / Mixed / Neutral / Unclear badge | Whitelist enum values. Do not derive it from just the highest-scoring aspect. |
| `aspects[].aspect` | Human-readable category name | Use the actual model's seven categories. |
| `aspects[].sentiment` | Positive/negative label on each gauge | Distinguish complaint detection from praise detection. |
| `aspects[].score` | Semicircle fill and “Model score 84/100” | Convert `0.84` to `84` for display only. Not a quality rating or measured accuracy. |
| `aspects[].evidence` | Expandable “Why this aspect?” quote | Keep original-language evidence alongside translation. |
| `needs_review` | “Needs checking” annotation | Visually de-emphasize tentative gauges; do not hide the underlying review. |
| `model_version` | Secondary provenance text | Save with the result and refresh after model changes. |

### Overall-sentiment provenance

`ClassifierService.java` currently derives sentiment from aspect hits. With no hits it falls back to stars, or `unknown` without stars. Proposed optional DTO field `sentiment_source` should distinguish `aspect-model`, `rating-fallback` and `unknown`. Until that field exists, the client can identify the no-hit/rating fallback from the payload and label it “Based on review stars.” Do not invent an overall sentiment probability: none is returned.

The class currently flags empty hits and declared unsupported languages. Conflicting positive/negative hits for the same aspect are not separately flagged; add that check as a backend follow-up and show both polarities rather than averaging them into a misleading single number.

## 4. Semicircle gauge design

**Proposed new file:** `src/components/aspect-gauge.tsx`.

Use a half-circle track with a foreground arc, a large numeric value in the center, and aspect name/polarity beneath it. The fill is `score × 180°`. Keep three prominent gauges maximum; use “Show more aspects” for additional returned hits.

- Order hits by descending score, with a deterministic aspect-name tie-break.
- Keep positive and negative hits distinct. If both appear for one aspect, use two explicitly labeled values or display the strongest hit with a visible mixed/tentative annotation and expandable details.
- Use teal plus the word “Positive,” coral plus “Negative”; color alone is insufficient.
- Show missing scores as unavailable, not zero. An absent aspect means no confident hit, not perfect performance or no issue.
- Include accessible text such as “Facilities, negative, model score 76 out of 100, needs checking.”
- At a 390-pixel screen width, use a wrapping layout that fits one/two gauges per row and supports larger text. Avoid horizontal scrolling for essential values.
- Draw with an Expo-compatible SVG implementation after checking compatibility with SDK 57, or use an existing compatible primitive. Do not add an unnecessary chart suite. Install native dependencies through `npx expo install` when implementation begins.

Scores in this backend are sigmoid head outputs for signed categories, rounded to two decimals. They are not calibrated confidence, percentage of satisfied customers, a FICO-equivalent score, or an overall business score. Keep the label “Model score” visible and the explanation close to the gauges.

## 5. Example responses

`backend/src/main/java/com/lauda/api/service/ReplyService.java` generates short/detailed templates from `ml/artifacts/texts.json`. `Draft` fields map as follows:

| Field | Display/behavior |
| --- | --- |
| `id`, `label` | Short / Detailed selector. |
| `language` | Actual draft language; may be English fallback. |
| `text` | Customer-language template. |
| `owner_preview` | Optional owner-language preview; this is independently composed wording, not a verified translation. |
| `warnings` | Fallback/uncertainty notices above the draft. |
| `requires_approval` | Enforce owner review before local approval; reject unexpected false value. |
| `analysis` | Update the matching per-review analysis without a second classification request. |

Use an explicit **Show example responses** action, then **Use as draft**. Never overwrite a typed response merely because the API finished. If an example is in the customer's language but the writing field is in another language, either switch the editor to the example's actual language with clear labeling, or explicitly translate it to the selected writing language. Do not insert `owner_preview` as if it were identical to the final customer response.

Keep the existing NLLB translation and manual editing flow. Templates should say “Backend template,” not “AI-generated.” Persist the exact selected draft language and provenance. The existing `AssistantOutput` contract lacks two variants and owner preview; do not force the full reply payload into that type. Introduce a dedicated decoder/contract.

Before exposing this endpoint, make `ReviewController.replyDraft(...)` reuse batch review validation for size, rating, language and date, plus bounded `business_name` and `owner_language` checks. It currently validates only nonblank review text. The English `texts.json` has generic openings/closings but no populated aspect-specific lines; fill those separately if detailed responses are expected to mention actual detected aspects.

## 6. Positive and negative dashboard sections

Modify existing `src/app/(tabs)/insights.tsx`, retaining automatic load and cached/error behavior.

| Section | Payload | Display |
| --- | --- | --- |
| Positive feedback | `qualitative.strengths` | Aspect label, summary, distinct-review count, supporting quotes and review links. |
| Negative feedback | `qualitative.problems` | Same aspect display plus existing priority label when useful. |
| All aspect counts | `quantitative.aspects` | Optional compact “View all aspects” list of positive/negative mention counts. |
| Needs checking | `attention.unread_review_ids`, `meta.unread` | Uncertain/unsupported reviews, visibly excluded from qualitative findings. |

The backend currently limits strengths to three and problems to five; current UI displays three of each. Keep that concise view, and use the quantitative aspect list if all supported categories must be visible. Zero counts do not imply a strong/weak quality score. Do not fabricate quotes for categories missing from qualitative findings.

**Important denominator:** current `AspectStat.share_negative` divides negative hits by all eligible analysed reviews, not by positive+negative mentions of that category. Label it “Share of analysed reviews mentioning a concern.” If displaying a stacked category-polarity bar, compute and label a separate mention ratio; do not reuse this field as if it meant that ratio.

Show human-readable names: Tour guide, Value for money, Communication, Facilities, Getting there, Food and refreshments, Other feedback. Do not add categories absent from the trained head. Some signed labels are disabled in current head metadata; disclose unavailable coverage rather than showing invented results.

The overview's star rating remains separate from any future LLM text. Suggested changes remain optional; the request here is to display aspects, not reinstate a large recommendation wall.

## 7. File-level implementation sequence

| Step | Existing files to modify | Proposed new files |
| --- | --- | --- |
| 1. Contract decoders | `src/ai/insights-api.ts` helpers or extracted common adapter | `src/ai/review-api.ts` for Analysis/ReplyResponse decoding and fetch methods. |
| 2. Local caches | `src/data/types.ts`, `src/data/profile.ts`, existing store/storage | `src/ai/review-analysis-cache.ts` for request identity and cache lookup. |
| 3. Gauges and sentiment | `src/app/reviews/[id].tsx`, theme if needed | `src/components/aspect-gauge.tsx`, `src/components/sentiment-badge.tsx`. |
| 4. Templates | Review screen and `ReplyService.java`/`texts.json` if expanding content | `src/components/reply-examples.tsx`. |
| 5. Dashboard | `src/app/(tabs)/insights.tsx` | No new route required. |
| 6. Validation/provenance | `ReviewController.java`, `Dto.java`, `ClassifierService.java` | Contract test fixtures only as needed. |

Cache identity includes business/profile identity, review ID, exact content/language/rating/date, API family, endpoint and model identity where available. The current profile has no stable business UUID: add one with migration if multi-business caches are introduced; at minimum clear the new caches in `finishSetup()` and prevent cross-workspace reuse.

Keep per-review analysis and template caches separate from corpus Insights. Bound caches; save complete validated responses through `src/state/store.tsx`. Stale/error responses must not overwrite the owner's draft or a newer analysis. On reopen render compatible saved results before probing the local service; on missing connection show a useful manual/translation fallback.

## 8. Acceptance criteria and team ownership

**Backend/model owner:** validate the reply endpoint, populate relevant template lines, add sentiment provenance, and maintain exact score semantics. **Frontend owner:** implement gauge/badge/template UI and dashboard sections. **Offline/integration owner:** request mapping, decoders, cache invalidation, persistence and end-to-end checks.

Checks before implementation merge:

1. A mixed review shows positive guide and negative facilities separately, with matching quotes.
2. A negative score of 0.90 displays “Negative · model score 90/100,” never “90% good.”
3. No hits produces “No confident aspects detected,” plus the correct star-derived/unknown sentiment label.
4. A reply payload with a wrong ID, unknown aspect, nonfinite score, invalid sentiment or approval flag is rejected.
5. Backend templates never overwrite an in-progress manual draft; their actual language is respected.
6. Evidence links open the original string-ID review, including reordered corpora.
7. Both dashboard sections show the correct aspects, counts and denominator, with excluded-review coverage visible.
8. With services stopped, saved results and translated drafts still load; missing results show an explicit unavailable state.
9. Mobile layout, screen-reader text and larger font sizes are verified; typecheck, lint, Java/API and frontend tests pass.

The current model showed false positives and low language coverage in the MVP test. UI plumbing and gauges cannot repair those errors. Evaluate/train the classifier independently and keep evidence checkable.
