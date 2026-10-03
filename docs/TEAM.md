# Three-person build split

| Owner | Files | Next work |
| --- | --- | --- |
| AI / models | `src/ai/`, model assets, evaluation scripts | Replace `demoAI` behind `AIProvider`; choose a small model, integrate inference in a development build, add English/Kiswahili/French translation coverage, low-confidence handling, measured latency and accuracy on target hardware. |
| UI / experience | `src/app/`, `src/components/` | Test physical phones, localize actual interface strings, improve keyboard and accessibility behavior, add new message/booking forms, validate tour times against structured business availability. |
| Offline / data | `src/data/`, `src/state/` | Split the versioned SQLite JSON snapshot into migrated relational tables, add import/export and deletion, storage/model management, tested messaging transport and retry queue. Never send a reply without explicit approval. |

Agree on `src/data/types.ts` and `src/ai/provider.ts` before parallel edits. Use separate feature branches and small pull requests. Avoid editing another owner's files without coordination.

## Demo walkthrough
1. Complete business setup. Profile saves locally; no login.
2. Home → Messages → Camille. Read original French, labelled example translation and booking fields.
3. Edit reply → Approve & queue locally. It persists; it is not sent.
4. Bookings → Camille → Confirm. Capacity validation runs before saving.
5. Insights → directions → supporting sample reviews.
6. Offline & AI reports actual device connection, local queue, and no installed model.
7. Restart app / enable airplane mode after initial loading: profile and edits remain.

## AI integrity
Seeded messages/reviews/bookings carry `demo: true`. Scripted analysis uses `source: demo-fixture`, null confidence, latency, and model version. Do not call this trained AI or report fixture results as model accuracy. Model adapters must record measured output provenance, language support and failures. Review themes are manually assigned. UI language selection records a preference; interface localization remains to be implemented.

## Data limitations
Native SQLite stores a versioned whole-app snapshot; writes are serialized and only update UI after persistence succeeds. Web preview uses localStorage without silently falling back to memory. No network inbox, send transport, cloud sync, authentication, model download or inference exists yet. Capacity checks cover confirmed guests per date/time, not overlapping tour intervals. Device QA and a real small-model demo are required before presenting offline AI claims.
