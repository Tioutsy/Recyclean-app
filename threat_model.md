# Threat Model

## Project Overview

Recyclean is a mobile-first React + Vite single-page application for tracking household recycling. Users can scan barcodes or take photos of items, classify them into recycling categories with an AI-assisted flow, view collection schedules, receive browser notifications, and export their history to CSV. Persistent data is stored client-side in `localStorage`, and the only server-like code in the repository is a Vite development proxy in `vite.config.js`.

Production scope for this repository is the static frontend build plus browser-managed components such as the service worker. Vite dev server settings, including `server.proxy` and `allowedHosts`, are dev-only unless a separate production deployment explicitly serves the app through Vite itself.

## Assets

- **Recycling history and schedule data** — entries, notes, dates, missed collections, and schedule overrides stored in browser storage. This is user data and may reveal household habits and approximate location/collection routines.
- **Captured scan content** — barcode values and photo-derived item metadata, including images captured from the camera flow before classification. Exposure would leak user activity and potentially private surroundings.
- **AI classification output** — model-generated item names, reasons, confidence values, and tips. This output is untrusted content because it originates outside the application and may be influenced by scanned images.
- **Notification state and schedule cache** — cached collection dates and notification history used by the service worker. Tampering could lead to misleading reminders or nuisance notifications.
- **OpenAI API credential if a backend proxy exists** — the repository contains a dev proxy that attaches `OPENAI_API_KEY`. If a production server were ever introduced around this route, the key and attached billing scope would become a high-value asset.

## Trust Boundaries

- **Browser UI to browser storage** — `src/App.jsx` reads and writes `localStorage` and the Cache API. All stored content must be treated as user-controlled when later rendered, exported, or reused.
- **Browser to AI classification endpoint** — the client posts user-controlled scan data to `/api/classify`. In the current repo this is only backed by Vite's development proxy, but any future production implementation would be a sensitive public API boundary.
- **Browser app to browser privileged APIs** — camera access, barcode detection, notifications, service workers, and periodic background sync are privileged browser features that require explicit permission and careful handling of untrusted input.
- **Main window to service worker** — the app sends messages and cached schedule data to `public/sw.js`. Message contents and cached values are not inherently trusted just because they originate from the client.
- **Public deployment boundary** — the application has no authenticated or admin surface. Any production endpoint that exists must be assumed reachable by unauthenticated internet users unless deployment visibility restricts access.

## Scan Anchors

- **Production entry points:** `index.html`, `src/main.jsx`, `src/App.jsx`, `public/sw.js`, `public/manifest.json`
- **Highest-risk code areas:** AI classification flow and export logic in `src/App.jsx`; service worker message and notification handling in `public/sw.js`
- **Public vs authenticated vs admin surfaces:** all current app functionality is public; there are no auth or admin roles in the repository
- **Usually dev-only:** `vite.config.js` Vite server proxy and host settings; ignore as production vulnerabilities unless real production reachability is demonstrated

## Threat Categories

### Tampering

The client is the source of truth for stored recycling history, schedule overrides, and missed-collection reports. Because there is no server-side integrity boundary, the app cannot assume stored values or model output are well-formed or safe for secondary uses such as exports, notifications, or future rendering. Any user-controlled or model-controlled value that is reused in another interpreter context must be normalized for that context.

Required guarantees:
- Data loaded from `localStorage`, Cache API, or AI responses MUST be treated as untrusted input.
- Untrusted values written into CSV, notifications, URLs, or future HTML contexts MUST be sanitized for the target format before use.
- If a production `/api/classify` endpoint is later introduced, it MUST constrain accepted request shapes and upstream parameters instead of forwarding arbitrary client payloads.

### Information Disclosure

The app stores user history and schedule data locally and may send scan content to an AI endpoint for classification. The main confidentiality risks are accidental exposure through client-side leaks, over-broad exports, or future introduction of secrets into the frontend bundle. Because there is no backend database, the relevant disclosure risks are local-device data exposure and leakage of external-service credentials.

Required guarantees:
- Secrets such as `OPENAI_API_KEY` MUST never be embedded in client-side code or static assets.
- Export features MUST not turn untrusted content into executable spreadsheet formulas or other active content.
- Error handling and browser notifications MUST avoid exposing unnecessary sensitive data.
- If scan photos are sent to an external AI service in production, users MUST understand that those images leave the device for processing.

### Denial of Service

If the AI classification route ever exists in production, it will be a public, unauthenticated cost-bearing endpoint. Even in a client-heavy app, an exposed proxy could be abused for request floods, oversized payloads, or unauthorized consumption of third-party API credits. Browser-only features can also be abused to create nuisance notifications if message handling is too permissive.

Required guarantees:
- Any production AI proxy MUST rate limit requests and bound payload size.
- Any production AI proxy MUST restrict the upstream model and parameters that unauthenticated users can invoke.
- Service worker-triggered notifications MUST only be driven by trusted app state and bounded schedules.

### Elevation of Privilege

There are no user roles, admin capabilities, or server-side access control paths in the current repository. The main privilege-escalation concern is indirect: if untrusted content crosses into a more powerful interpreter such as spreadsheet software or a future server-side proxy, the attacker gains capabilities beyond normal app usage.

Required guarantees:
- Untrusted AI or user content MUST NOT be exported or transformed in ways that grant execution in downstream tools.
- Future server-side endpoints added to support classification or storage MUST enforce authorization and MUST NOT function as open relays to paid third-party APIs.
