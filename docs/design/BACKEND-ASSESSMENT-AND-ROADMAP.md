# Backend assessment and implementation roadmap

Reviewed snapshots: main `acc1958`, integration `f21bdee`. Paths are repository-relative. This document assesses implementation readiness; it does not change backend code.

## 1. How close is the backend?

The integration branch provides an end-to-end laptop prototype: local reviews enter a validated API, a learned classifier returns aspects, aggregation provides findings, and optional Qwen produces ideas. The frontend saves results. The newer main design is closer to the desired **explainable findings format**, but it is currently not runnable. Neither snapshot provides production review ingestion, model-generated reply drafts, or standalone phone inference.

| Expected behavior | Integration | New main | Remaining work |
| --- | --- | --- | --- |
| Classify review aspects | Implemented with MiniLM + head | Updated classifier exists | Reconcile labels and validate quality. |
| Show recurring strengths/problems | Basic aggregation | Rich grouping, counts, shares and issues | Complete orchestration and stable contract. |
| Cite supporting review evidence | Review IDs | Selected clauses and translated quote fields | Verify quote accuracy and preserve original text. |
| Suggest next products/actions | Templates plus optional Qwen | Authored localized actions planned | Preserve Qwen adapter and connect richer findings. |
| Suggest a review response | Template fallback | No complete reply generator | Implement teammate provider behind existing contract. |
| Translate owner/customer text | Local NLLB bridge | Empty Java translator | Connect adapter or let frontend translate explicitly. |
| Work with Wi-Fi disabled on laptop | Available after setup with local services | Build blocked | Finish main, package artifacts and retest. |
| Operate on iPhone without laptop/network | Local data/cached results only | Not implemented | Native inference development project. |
| Import real business reviews | Sample fixtures only | Training data preparation, not ingestion | Import workflow and provenance. |
| Publish an approved response | Saves locally only | Not implemented | Platform integration after explicit owner action. |

Avoid a percentage-complete claim: integration readiness, API completeness and model quality are separate measurements.

## 2. Confirmed build blockers on main

A compile was attempted against the reviewed main worktree using Java 17 and cached Maven dependencies: `mvn -o -f backend/pom.xml -DskipTests compile`. Compilation failed. This is current evidence, not an inferred risk.

| Existing filename | Finding | Required correction |
| --- | --- | --- |
| `backend/src/main/java/com/lauda/api/service/AnalysisService.java` | Zero-byte file; `ReviewController.java` references a missing class. | Implement the Spring service and analysis orchestration. |
| `backend/src/main/java/com/lauda/api/service/Translator.java` | Empty class, no `translate(String,String,String)` and no service registration. | Implement a tested adapter or remove the dependency in favor of explicit frontend translation. |
| `ml/artifacts/phrasebook.json` | Zero bytes; not a usable JSON phrasebook. | Add validated templates with a defined language fallback. |
| `ml/eval_issues.py` | Zero bytes. | Implement issue/evidence evaluation; do not claim measured issue accuracy yet. |

The phrasebook is a subsequent runtime risk rather than the measured compile failure: missing templates are used by insight formatting, so the completed application must validate required template keys at startup and handle missing templates without null dereferences.

A clean clone also needs model weights. The large encoder is not in Git. Retain the integration setup script and checksum validation; a working developer cache is not a distributable repository.

## 3. Merge incompatibilities to resolve first

These files need intentional reconciliation, not just conflict-marker removal:

| Filename | Required decision |
| --- | --- |
| `backend/src/main/java/com/lauda/api/dto/Dto.java` | Main adds evidence/issue and language/rating fields; old constructor calls must be updated. Define one canonical internal result and one versioned frontend envelope. |
| `backend/src/main/java/com/lauda/api/service/InsightService.java` | Main changes `build(...)` to consume `InsightsRequest`; integration workspace and Qwen calls expect the previous types. Add an adapter and update callers/tests together. |
| `backend/src/main/java/com/lauda/api/controller/WorkspaceController.java` | Preserve string IDs, uniqueness/size validation and complete result coverage; translate richer main findings into the chosen contract. |
| `backend/src/main/java/com/lauda/api/service/SmallLlmService.java` | Preserve optional local Qwen behavior; consume richer findings without inventing evidence or counts. |
| `backend/src/main/java/com/lauda/api/controller/ReviewController.java` | Connect completed `AnalysisService`; bound/validate old numeric APIs or deprecate them. |
| `backend/src/main/resources/application.properties` | Preserve deliberate host binding and model directory configuration. |
| `src/ai/review-analysis.ts` | Add versioned decoding for rich findings; fail visibly on incompatible responses. |
| `src/app/(tabs)/insights.tsx`, `src/app/reviews/[id].tsx` | Render new evidence/issue information without relabeling templates as generated AI. |
| `ml/labels_config.py`, `ml/artifacts/head_v1.json`, `ml/artifacts/issues.json` | Align training labels, head dimensions and issue catalogue. Integration includes `coffee_tasting`; main uses generic categories. |

## 4. Model evidence and limitations

These numbers are **recorded artifact metadata**, not newly reproduced evaluation results:

| Artifact snapshot | Label count | Recorded validation macro F1 | Recorded baseline validation macro F1 |
| --- | --- | --- | --- |
| Integration `head_v1.json` | 16 signed labels | 0.8532 | 0.9634 |
| Main `head_v1.json` | 14 signed labels | 0.3626 | 0.2278 |

Different datasets/label sets mean these rows are not a controlled regression experiment. The integration model's recorded baseline exceeds its learned-model score. Main's model improves its recorded baseline but still has substantial classification error. Neither result justifies a high-confidence production accuracy claim.

The inspected training CSV contains 349 reviews in integration and 500 in main, all marked English. Main's split is 346 training, 90 validation and 64 test. Head metadata lists English and Kiswahili, but the inspected CSV does not demonstrate Kiswahili evaluation. Present it as declared metadata until language-specific human-labeled tests exist.

Current labels include guide, price value, communication, facilities, access/transport, food and other. Main disables communication-positive, communication-negative, other-positive and other-negative. A selectable category does not mean the learned head currently supports it. Integration has an additional coffee category and a disabled transport-negative label. Reconcile these differences before retraining.

### Specific analytical risks

1. Yelp-derived weak labels associate overall stars with aspect sentiment. A four-star review saying “great guide, dirty toilets” can receive an incorrect positive facilities label. Label each aspect separately in a human-reviewed benchmark.
2. Classification truncates at 128 tokens. Evidence extraction over clauses does not remove the whole-review threshold gate; a late complaint can still be missed. Test long and mixed reviews.
3. Main's issue matcher chooses by embedding similarity. Similarity is not a calibrated issue probability. Evaluate issue precision and the “unspecified” fallback by category/language.
4. Main's evidence is the highest-scoring clause. Check negation, contrast, unrelated clauses and exact quotation integrity; do not call it verified evidence before testing.
5. Main's pattern rule uses `count >= 3 OR share >= 0.15`; one of one reviews becomes a “pattern.” Add a minimum sample size and use labels that convey frequency, not statistical confidence.
6. Integration includes flagged reviews in aggregate findings; main excludes them. Choose and document one policy. Show excluded count and uncertainty rather than silently changing the denominator.
7. Both heads call themselves `v1` despite different weights. Version model packages with content hashes before relying on caches.
8. Clause-level scoring adds encoder passes, so earlier whole-review timings cannot predict new-main latency. Benchmark cold/warm runs and corpus sizes separately.

## 5. Prioritized implementation plan

### P0 — one runnable contract

**Backend owner:** complete `AnalysisService.java`, `Translator.java` and `phrasebook.json`; reconcile DTOs and service callers; restore loopback/CORS defaults. Keep the working frontend endpoint during migration.

**Frontend owner:** agree on the versioned envelope, add strict decoding in `src/ai/review-analysis.ts`, and make states explicit: saved/current, saved/stale, analyzing, unavailable and failed. Keep the last valid results on failed requests.

**Data/model owner:** align label sets and export a uniquely identified manifest/head/encoder package. Preserve downloaded weight setup and run a smoke inference from a clean local checkout.

Acceptance: Maven compiles and tests pass; all workspace review IDs round-trip; rich findings show only supplied evidence IDs; NLLB failure preserves original quotes; Qwen failure preserves classifier findings; unsupported API versions do not overwrite saved results.

### P1 — useful and trustworthy review analysis

Implement a CSV/JSON import workflow with preview, required fields, duplicate detection and per-review provenance. Use main's richer grouping through the frontend boundary. Separate imported business reviews, synthetic demo reviews and evaluation samples in both storage and UI.

Create a human-labeled held-out set covering guide, value, communication, facilities, transport, food and other; include mixed sentiment, neutral text, negation, short text and long reviews. Add Kiswahili and the actual demo languages. Report per-label precision/recall/F1 and language-specific coverage. Keep business-group splits from `ml/assign_splits.py`.

Complete `ml/eval_issues.py` for issue assignments and evidence quality. Calibrate thresholds on validation, report held-out test metrics once, and record failure cases. Do not tune against the final test set.

Acceptance: imported review text remains unchanged; an identified benchmark reports counts, label provenance and model hash; disabled categories are marked unsupported; counts use unique review IDs; only sufficiently repeated issues are called recurring.

### P1 — teammate reply-model connection

Use `src/ai/assistant-contract.ts` and `src/ai/review-assistant.ts` as the integration seam. The teammate can develop separately, but integration must pin a revision and define a local transport/runtime contract. A GitHub link alone does not connect running services.

Provide a reply endpoint with review ID/text, owner language, customer language, business facts and explicit output provenance. Return a draft, model ID/hash, latency and cited review IDs. Constrain claims: no invented refunds, policy promises, personal facts or automatic publishing. Translation remains a separate capability unless the teammate's model is evaluated for it.

Acceptance: a real model result is labeled generated; template fallback is labeled template; the owner edits/approves every reply; rejecting a draft changes no approved reply; service failure retains the owner's text.

### P2 — reliable offline packaging

Implement the [offline design](OFFLINE-DATA-AND-INFERENCE.md): business identity, versioned caches, persisted translated drafts, local import/export, startup capability checks and interrupted-job recovery. First prove the whole laptop workflow with internet disabled and uncached text. Move selected inference to a native development build only after device profiling.

Acceptance: refresh/restart keeps data; new local analysis and translation succeed without internet when laptop models are ready; missing weights yield an honest actionable state; no request silently goes to a cloud provider.

## 6. Three-person split

| Owner | Primary existing files | New deliverable / boundary |
| --- | --- | --- |
| Backend + model teammate | Java service/controller/DTO files; `ml/train.py`, `ml/evaluate.py`, `ml/export.py`, `ml/eval_issues.py`, artifacts | Runnable rich findings, tested contract, unique model manifest and quality report. |
| App + design teammate | `src/app/`, `src/components/`, `src/ai/review-analysis.ts`, reply-provider client | Evidence UI, clear states, accessible mobile layout, import/response flows. |
| Offline + integration teammate | `src/state/store.tsx`, `src/data/storage.ts`, `src/data/storage.web.ts`, translation cache, launch scripts | Transactional persistence, migrations, backups, capability checks and repeatable offline demo. |

Agree on the response schema before parallel edits. Keep service implementation, UI presentation and persistence adapters in separate commits. One owner coordinates DTO/client changes and adds contract fixtures for both sides.

## 7. Checks required before merging implementation

- Java: compile and run the backend tests, including string-ID coverage, malformed payloads, bounded inputs, evidence membership and optional-service failures.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`; export the browser bundle and inspect routes at the final demo origin.
- Translation: run `ai/translation/test_server.py` and the translation evaluation runner with local assets; include the final browser origin and wrong-pairing-code cases.
- Main-specific: valid phrasebook keys, issue catalogue coverage, missing model errors, safe readiness endpoint and deterministic frequency counts.
- Manual: import, translate, save draft, restart, generate insights, open evidence, approve locally, then repeat with Wi-Fi disabled.

No current main tests are claimed to pass: the observed compile failure prevents readiness. Historical integration checks are not a substitute for retesting the reconciled commit.
