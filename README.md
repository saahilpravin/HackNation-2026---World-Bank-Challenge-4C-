# HackNation-2026---World-Bank-Challenge-4C-
Build AI that works where connectivity, devices and infrastructure are constrained. Create a targeted, offline-capable solution for health, agriculture or tourism, designed around local languages, real-world data and the devices people already have.


## Lauda mobile app
React Native + Expo SDK 57 + TypeScript + Expo Router. Four tabs: Home, Messages, Bookings, Insights. Secondary routes cover onboarding, profile, offline status, message review, booking edits and insight evidence.

```sh
npm ci
npm start
# Scan the Expo QR using an SDK-compatible Expo Go on your phone.
npm run web
npm run typecheck
npm run lint
npm test
```

Use a development build if your installed Expo Go does not support this SDK. No secrets, login or backend are needed. First install/load requires internet; native data is retained in SQLite on the device. Web preview uses browser localStorage.

**AI is scripted demo data, not an installed or evaluated model.** Replies require human approval and stay in a local outbox; no messages are sent. See [team ownership and demo guide](docs/TEAM.md) for remaining work and limitations.

If Metro reports too many file watchers on macOS, use `CI=1 npm start` temporarily (restart the server after edits) or install Watchman from its official distribution.

## Lauda branding and workspace setup
Lauda is a general business companion. First launch offers an empty business workspace or an explicitly selected Noor’s Coffee Farm demo. Display name, launcher icon, deep-link scheme and web title are Lauda. The original native database filename is retained to preserve saved data; web storage copies legacy records into the Lauda key. Existing profiles, approvals and bookings are not reset by the rebrand. The local checkout folder and original team repository URL remain the same.

For the web preview on this Mac run `CI=1 npm run web` and open http://localhost:8082. Stop/restart after edits in CI mode. A native development build must be rebuilt to update its installed name and icon.
