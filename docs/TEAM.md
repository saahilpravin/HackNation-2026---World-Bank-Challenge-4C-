# Three-person build split

| Owner | Work |
| --- | --- |
| AI / models | Implement the assistant contract, evaluate response quality and evidence citations, provide model artifacts/runtime requirements. See AI-INTEGRATION.md. |
| UI / experience | Verify physical iPhone layouts, keyboard behavior, translated review reading, draft/approval flow, booking entry and accessibility. Localize interface strings if needed. |
| Offline / data | Implement operator platform imports/exports, storage migration, model packaging, and physical airplane-mode checks. Do not add a customer inbox or automatic reply sending. |

## Current demo

1. Choose Noor's demo workspace during onboarding.
2. Home → Reviews → Needs reply → French → choose a review.
3. Choose a reading language, check original text, write a response and save a draft.
4. Reopen the review: the draft persists. Translate custom text through the paired NLLB laptop; review the result and approve locally.
5. Bookings → Record a booking received elsewhere. Confirm/edit it; capacity is checked per date/time slot.
6. Insights → Overview → supporting evidence; Ideas lab → experiment and a way to test it.
7. Offline & AI explains what runs locally and what still needs a connected laptop.
8. Restart the app and check saved drafts, approvals and bookings. Test airplane mode on the physical phone after installation.

## Provenance and remaining work

150 synthetic reviews are language variants of 15 authored scenarios, not 150 independent customers. Forty contain labeled example responses. Samples and actual records remain separate. Existing approvals and records are preserved.

NLLB performs real laptop translation; bundled sample translations are unreviewed machine outputs. Suggested replies are authored examples until the teammate's model is integrated. Insights are local English keyword rules; nine ideas are curated examples matched to review themes. A model does not currently generate them.

Native data is stored as a serialized SQLite snapshot, web data in localStorage. No customer inbox, live platform import, external posting, cloud sync or phone-local model is connected. Legacy message code remains outside the route tree for reference; old message URLs redirect to Reviews.
