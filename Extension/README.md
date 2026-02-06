# BrowseGuard - Browser Extension

Real-time security assessments for websites and emails via pop-up UI with risk indicators and confidence scores.

**Owner:** Jackson
**Role:** Extension architecture, event hooks, pop-up UI, API integration, password detection, testing

---

## File Structure

```
Extension/
├── manifest.json              # Entry point - start here
├── src/
│   ├── background/
│   │   └── service-worker.js  # Background logic, API calls
│   ├── content/
│   │   └── content-script.js  # Injected into pages
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── components/
│   │   ├── risk-indicator.js
│   │   ├── confidence-score.js
│   │   └── password-checker.js
│   └── utils/
│       ├── api-client.js
│       ├── storage.js
│       └── messaging.js
├── assets/icons/
├── styles/
├── tests/
└── docs/NOTES.md
```

---

## Core Files

| File | Purpose |
|------|---------|
| `manifest.json` | Permissions, scripts, metadata |
| `service-worker.js` | Background events, API calls |
| `content-script.js` | DOM access, page detection |
| `popup.*` | Extension icon click UI |

---

## Permissions (Manifest V3)

```json
{
  "permissions": ["activeTab", "storage", "alarms"],
  "host_permissions": ["https://api.browseguard.com/*", "<all_urls>"]
}
```

---

## Extension Contexts

| Context | DOM Access | Persistent | Use For |
|---------|------------|------------|---------|
| Service Worker | ✗ | ✓ | API calls, events |
| Content Script | ✓ | ✗ | Page analysis |
| Popup | Own only | ✗ | User interaction |

Communication: `chrome.runtime.sendMessage()`

---

## Event Hooks

| Event | API |
|-------|-----|
| Navigation | `chrome.tabs.onUpdated` |
| Page load complete | `chrome.webNavigation.onCompleted` |
| Email opened | Content script + MutationObserver |
| Password input | `input` event on `[type="password"]` |

---

## Pop-up Options

| Approach | Complexity | Notes |
|----------|------------|-------|
| Content script overlay | High | Honey-style, full control |
| Badge + click popup | Low | Traditional, reliable |
| Side Panel API | Medium | Chrome 114+, persistent |

---

## API Contract

**Request:**
```json
{
  "url": "https://example.com",
  "userId": "user-id",
  "timestamp": "ISO-8601",
  "context": "navigation | email-link | form-detected"
}
```

**Response:**
```json
{
  "riskLevel": "safe | uncertain | suspicious | malicious",
  "confidenceScore": 85,
  "reasons": ["Known domain", "Valid SSL"],
  "cached": false
}
```

**Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/assess/url` | URL assessment |
| POST | `/api/assess/email` | Email assessment |
| POST | `/api/auth/device` | Device registration |
| GET | `/api/user/history` | Browsing history |

---

## Security

- No API keys in extension code
- HTTPS only
- Validate content script data
- Password checking = client-side only

---

## Setup

```bash
npm init -y
npm install --save-dev webpack webpack-cli jest web-ext
```

**Load in Chrome:**
1. `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select folder

---

## Testing

**Unit:** Password algorithm, color logic, response parsing
**Integration:** Messaging, API errors, storage

**Manual Checklist:**
- [ ] Chrome, Firefox, Edge
- [ ] Gmail, Outlook web
- [ ] Offline/slow network
- [ ] HTTP vs HTTPS sites

---

## Stretch Goals

| Feature | Notes |
|---------|-------|
| Real-time updates | WebSocket |
| Site blocking | `chrome.declarativeNetRequest` |
| Ad blocking | Filter lists + declarativeNetRequest |
| Password strength | zxcvbn library |

---

## Resources

- [Chrome MV3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Mozilla WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [zxcvbn](https://github.com/dropbox/zxcvbn)
- [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
