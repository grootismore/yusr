# Third-party SDK and service inventory (launch checklist 8)

No advertising, analytics, attribution or crash-reporting SDK is installed. Sentry (listed as optional in the PRD) was deliberately left out for this release; add it only with scrubbing that removes amounts, lenders and notes, then update this file, the privacy policy and the store labels.

## Runtime libraries that touch user data

| Library | Purpose | Data leaves the device? |
| --- | --- | --- |
| `@supabase/supabase-js` | Auth and database calls to the project's Supabase | Yes: the user's own data, to Supabase only |
| `@tanstack/react-query` (+ persist client) | Cache and offline queue | No (stored in local SQLite) |
| `expo-sqlite` | Local cache of the user's data and queued changes | No |
| `expo-secure-store` | Session tokens, language | No |
| `expo-local-authentication` | Face ID / fingerprint lock | No (handled by the OS) |
| `expo-notifications` | Local reminders only; no push token is requested or sent | No |
| `expo-screen-capture` | Blocks screenshots on Wasiyyah screens (Android) | No |
| `expo-crypto` | Random ids and invite tokens, SHA-256 | No |
| `expo-haptics` | Light taps on choices, saves and confirmations (can be turned off in Settings) | No |
| `expo-symbols` | Draws Apple's SF Symbols on iOS | No |
| `expo-system-ui` | Lets Android follow the system light/dark setting | No |
| `expo-localization`, `i18next`, `react-i18next` | Language and RTL | No |
| `@umalqura/core` | Hijri date calculation | No |
| `@react-native-community/netinfo` | Online/offline state | No |

Everything else (`expo-router`, `expo-font`, `expo-linking`, `expo-constants`, `expo-status-bar`, `react-native-*`, `@expo/vector-icons`, `@react-native-community/datetimepicker`) is UI plumbing with no network use.

## Services (processors)

| Service | Used for | Data | Status |
| --- | --- | --- | --- |
| Supabase (Postgres, Auth, Edge Functions, Vault) | Everything server-side | All user data, encrypted at rest; secret fields in Vault | In use (yusr-dev) |
| Netlify | Hosts the invite-accept page and the legal pages | Standard web server logs; the invite token is in the URL fragment and is not sent to Netlify | In use |
| Resend | Emailing trusted contacts | Contact email address and message | **Not yet used.** Invites are shared by the owner as a link. List it in the privacy policy only when it is wired up |
| Expo (EAS) | Builds and store submission | No user data | Build tooling |

## Store privacy labels and Data Safety (draft that matches the above)

- Data collected: email address (account), user content (financial entries, notes, trusted-contact names and emails), other user content (Wasiyyah register).
- Linked to the user: yes. Used for tracking: no. Third-party advertising: none.
- Purposes: app functionality only.
- Encryption in transit: yes. Deletion: in-app, plus the web page.
- Diagnostics/crash data: none collected.
