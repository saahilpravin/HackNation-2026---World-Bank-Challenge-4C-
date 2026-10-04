# Lauda: architecture and implementation design

**Reviewed 3 October 2026.** This is a source-based design review, not a claim that all proposed features are implemented.

The repository currently has two different application snapshots:

| Snapshot | Source commit | What it contains |
| --- | --- | --- |
| `main` | `acc1958` | New Java review analysis, issue matching, evidence quotes and owner-language findings. Currently does not compile. |
| `codex/lauda-integration`, PR #1 | `f21bdee` | Expo app, local persistence, working laptop analysis endpoint, optional Qwen suggestions, and NLLB translation bridge. |

These documents are added to `main` without merging or changing either implementation. Filenames identified as **integration** exist in PR #1; they are not present in the reviewed main snapshot. Filenames identified as **proposed** do not exist yet.

1. [Current architecture](CURRENT-ARCHITECTURE.md): product scope, exact file responsibilities, routes, services, models and current contracts.
2. [Backend assessment and implementation roadmap](BACKEND-ASSESSMENT-AND-ROADMAP.md): build blockers, model evidence, contract reconciliation and three-person work allocation.
3. [Offline data and inference design](OFFLINE-DATA-AND-INFERENCE.md): existing persistence, proposed schema, loading results, model packaging and an offline acceptance checklist.

## Immediate decision

Use **the laptop application with local services** for the next complete demo. Make it run with Wi-Fi disabled after installing dependencies and downloading weights. This demonstrates local inference; it does not demonstrate phone-only inference. A phone-shaped browser presentation or Figma frame changes presentation, not where computation happens.

Before merging PR #1, complete the new main backend and make its richer findings available through a versioned, string-ID workspace contract. Preserve the existing frontend's validation and local cache. Do not replace the working API with the unfinished endpoint without an adapter.

## Desired product behavior

Lauda is a business-owner workspace. Noor's tourism business is a demonstration profile, not the application identity. Owners import or obtain existing reviews, read them in a chosen language, draft or request a suggested response, approve it themselves, and investigate recurring feedback with supporting review evidence. Reviews are not collected from tourists inside this app. There is no customer messaging inbox in the active product.

The current app has five tabs: **Home, Reviews, Bookings, Insights, Help**. Business profile and Offline & AI are secondary screens. Bookings are manual local records; Help uses authored navigation guidance. Review publishing to external platforms is not implemented.
