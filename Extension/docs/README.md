# BrowseShield - Browser Extension

Chrome Manifest V3 extension that provides real-time security assessments for websites and emails. Scans pages for risk indicators, extracts email metadata from Gmail/Outlook, and displays confidence-scored results via a toolbar popup.

**Owner:** Jackson

---

## File Structure

```
Extension/
├── manifest.json               # MV3 config, permissions, content script registration
├── package.json                # Dev dependencies (chrome-types, vitest, jsdom)
├── jsconfig.json               # IDE intellisense config
├── scripts/
│   ├── background.js           # Service worker — message hub, API orchestration, token refresh, email scanner injection
│   ├── content.js              # Content script — DOM scanning, forms, links, security indicators
│   ├── email-scanner.js        # Webmail extractor — Gmail/Outlook sender, subject, links, attachments
│   ├── popup.js                # Popup UI — risk ring, star rating, reasons, auth
│   └── api.js                  # API client — token storage, auth endpoints, assessment calls
├── pages/
│   ├── popup.html              # Extension toolbar popup
│   └── block.html              # Block/warning page (placeholder)
├── styles/
│   └── popup.css               # Risk ring, star rating, color-coded styling
├── images/                     # Extension icons (16/48/128px — not yet added)
├── tests/
│   ├── content.test.js         # Page scanning logic
│   ├── email-scanner.test.js   # Email extraction (Gmail/Outlook/generic)
│   ├── popup.test.js           # UI rendering, auth flows
│   ├── background.test.js      # Message routing, token refresh
│   ├── background-email.test.js # Email message handling
│   ├── api.test.js             # Token management, API calls
│   └── chrome-mock.js          # Mock Chrome API for testing
���── docs/
    └── README.md
```

---

## Core Files

| File | Purpose |
|------|---------|
| `manifest.json` | Permissions, content scripts, service worker, metadata |
| `scripts/background.js` | Service worker — API calls, message routing, token refresh via chrome.alarms, email scanner injection |
| `scripts/content.js` | DOM scanning — forms, links, HTTPS, security indicators; sends PAGE_SCAN to background |
| `scripts/email-scanner.js` | Webmail extraction — Gmail/Outlook provider registry; sender, subject, links, attachments |
| `scripts/popup.js` | Popup UI — risk ring, 5-star rating, reasons list, login/logout |
| `scripts/api.js` | API client — token management, auth endpoints, assessment submission, auto-refresh |
| `pages/popup.html` | Extension icon click UI |

---

## Permissions (Manifest V3)

```json
{
  "permissions": ["activeTab", "alarms", "storage", "declarativeNetRequest", "scripting"],
  "host_permissions": ["https://api.browseshield.dev/*"]
}
```

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current tab URL |
| `alarms` | Schedule token refresh (2 min before expiry) |
| `storage` | Local token and cache storage |
| `declarativeNetRequest` | Future blocking capability |
| `scripting` | Inject email-scanner.js on demand to Gmail/Outlook |

---

## Extension Contexts

| Context | DOM Access | Chrome APIs | Role |
|---------|------------|-------------|------|
| Service Worker | No | Full | API calls, orchestration, token refresh, email scanner injection |
| Content Script | Page DOM | `runtime`, `storage` | DOM scanning on all URLs |
| Email Scanner | Page DOM | `runtime` | Webmail metadata extraction (injected on demand) |
| Popup | Own DOM | Full | User-facing risk display and auth UI |
| API Client | No | `storage`, `runtime` | Token management, HTTP requests |

**Page scan flow:** Content script scans DOM → `PAGE_SCAN` message → background calls `POST /v1/assess` → result sent to popup

**Email scan flow:** Background injects email-scanner.js on Gmail/Outlook �� `EMAIL_SCAN` message → background calls `POST /v1/assess/email`

---

## Risk Display

| Level | Color | Stars |
|-------|-------|-------|
| **Safe** | `#34c759` green | 5 |
| **Suspicious** | `#f5a623` orange | 3 |
| **Unsafe** | `#e5383b` red | 1 |

Confidence score displayed as 0-100% inside the risk ring.

---

## Setup

```bash
npm install                     # Install dev dependencies
npm test                        # Run Vitest test suite
```

**Load in Chrome:**
1. `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select `Extension/` folder

---

## Security

- Content script data is **untrusted** — validated in service worker before use
- Tokens stored in `chrome.storage.local` (not synced across devices)
- Refresh tokens hashed before database storage on backend
- HTTPS only for API communication

---

## Resources

- [Chrome MV3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Mozilla WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
