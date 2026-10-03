# Three-person build split

| Owner | Files | Next work |
| --- | --- | --- |
| AI / models | `src/ai/`, model assets, evaluation scripts | Replace `demoAI` behind `AIProvider`; choose a small model, integrate inference in a development build, evaluate the ten supported translation languages, low-confidence handling, measured latency and accuracy on target hardware. |
| UI / experience | `src/app/`, `src/components/` | Test physical phones, localize actual interface strings, improve keyboard and accessibility behavior, add new message/booking forms, validate tour times against structured business availability. |
| Offline / data | `src/data/`, `src/state/` | Split the versioned SQLite JSON snapshot into migrated relational tables, add import/export and deletion, storage/model management, tested messaging transport and retry queue. Never send a reply without explicit approval. |

Agree on `src/data/types.ts` and `src/ai/provider.ts` before parallel edits. Use separate feature branches and small pull requests. Avoid editing another owner's files without coordination.

## Demo walkthrough
1. Complete business setup. Profile saves locally; no login.
2. Home → Messages → Camille. Read original French, labelled example translation and booking fields.
3. Edit reply → Approve & queue locally. It persists; it is not sent.
4. Bookings → Camille → Confirm. Capacity validation runs before saving.
5. Insights → Reviews → filter Needs reply and French → select a review → switch reading language → write and translate a response → approve locally.
6. Ideas lab → choose an experiment → read supporting reviews and the proposed validation plan.
6. Offline & AI reports actual device connection, local queue, and no installed model.
7. Restart app / enable airplane mode after initial loading: profile and edits remain.

## AI integrity
Seeded messages/reviews/bookings carry `demo: true`. Scripted analysis uses `source: demo-fixture`, null confidence, latency, and model version. Do not call this trained AI or report fixture results as model accuracy. Model adapters must record measured output provenance, language support and failures. Review themes are manually assigned. UI language selection records a preference; interface localization remains to be implemented.

## Data limitations
Native SQLite stores a versioned whole-app snapshot; writes are serialized and only update UI after persistence succeeds. Web preview uses localStorage without silently falling back to memory. No network inbox, send transport, cloud sync, authentication or on-device model inference exists yet. NLLB translation is connected to a local laptop service; sample language versions are bundled for offline reading. Capacity checks cover confirmed guests per date/time, not overlapping tour intervals. Device performance and translation quality still need measurement; do not present the laptop bridge as phone inference.

## Feedback studio demo (October 3)
150 synthetic review records across ten languages, created from 15 authored scenarios. These are repeated scenarios in language variants, not 150 independent customer observations. Forty records contain labeled example responses. Existing local approvals take precedence and survive the demo migration.

Feedback findings use explainable rules on English scenario text; nine curated experiments link to manually tagged review themes. NLLB translates language variants but does not generate the insights or example replies. A real review-analysis SLM remains the AI teammate's next task. Keep source IDs and evidence citations in that adapter.

Operator reviews are imported; the tourist-facing Leave a review form has been removed. Platform import and external reply delivery remain future data work.
