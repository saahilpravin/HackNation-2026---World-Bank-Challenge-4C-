# Starter validation

Validated on October 3, 2026:
- TypeScript: passed.
- ESLint: passed without warnings.
- Six automated tests: passed (capacity, invalid date/time/guest count, approval-only queue, duplicate prevention, fixture provenance and rejection of fixture output for real messages).
- Expo Doctor: 21/21 checks passed.
- Web preview: onboarding, approved reply persistence after reload, booking validation and confirmation, insight evidence, and 390 × 844 dashboard layout checked.
- iOS and Android JavaScript/Hermes bundle export passed. This is not a native signed build or physical-device test.

Native SQLite persistence must still be exercised on an actual iOS/Android device. Browser persistence was verified using the web-specific localStorage adapter. No installed AI model or measured AI result exists.

Dependency audit: 29 reported issues (19 high, 10 moderate) remain in the SDK dependency tree after applying non-breaking automatic fixes. Audit suggestions include incompatible SDK changes/downgrades; do not use `npm audit fix --force` blindly. Review and resolve SDK advisories before production deployment.

On this Mac, Metro's normal watch mode exceeded the operating-system watcher limit. The checked preview runs with `CI=1` and requires restarting after edits. Expo's optional React Native DevTools download also fell back because its cache directory was inaccessible; this did not prevent serving or bundling the app.

## Lauda redesign validation
TypeScript and lint pass. Nine tests pass, including clean first-launch data, generic business setup, and legacy demo-profile handling. Web, iOS and Android bundle exports pass. Phone-width browser QA verified the Lauda welcome, demo dashboard, and an empty City Studio business using a custom owner name and EUR pricing. New app icon and manifest name are Lauda. Existing browser data is copied from the legacy storage key without removing the original. The native SQLite filename remains unchanged; installed-app upgrades must also retain their existing bundle/package identifier to keep the OS data container. No signed native build or physical-device test was performed.

## Readability and navigation update
Reduced dashboard text and removed the promotional hero. Added a persistent four-tab navigation bar with 64-point minimum targets, larger labels, unread count and selected-state semantics. Navigation remains available on detail/settings pages. Browser QA at phone width verified all four destinations, including message-detail to Bookings, selected-state attributes and the fixed navigation while scrolling. TypeScript, ESLint and web/iOS/Android bundle exports passed. Native device QA remains outstanding.
