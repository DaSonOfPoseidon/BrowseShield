# BrowseShield - Browser Extension

Real-time security assessments for websites and emails via pop-up UI with risk indicators and confidence scores.

**Owner:** Jackson
**Role:** Extension architecture, event hooks, pop-up UI, API integration, password detection, testing

---

## File Structure

```
Extension/
├── manifest.json          # MV3 manifest - entry point
├── package.json           # Dev dependencies (chrome-types)
├── jsconfig.json          # JS intellisense config
├── scripts/
│   ├── background.js      # Service worker - background logic, API calls
│   ├── content.js         # Content script - DOM scanning, page analysis
│   └── popup.js           # Popup UI logic
├── pages/
│   ├── popup.html         # Extension toolbar popup
│   └── block.html         # Block/warning page (planned)
├── styles/
│   └── popup.css          # Popup styling
├── images/                # Extension icons (16/48/128px)
└── docs/
    └── README.md
```

---

## Core Files

| File | Purpose |
|------|---------|
| `manifest.json` | Permissions, scripts, metadata |
| `scripts/background.js` | Service worker - events, API calls |
| `scripts/content.js` | DOM scanning, sends results to service worker |
| `scripts/popup.js` | Popup interaction logic |
| `pages/popup.html` | Extension icon click UI |

---

## Permissions (Manifest V3)

Currently minimal — expand as features are added:

```json
{
  "permissions": ["storage"]
}
```

Planned additions as features land:
- `activeTab` — access current tab for URL assessment
- `alarms` — scheduled checks
- `host_permissions` — API endpoint access

---

## Extension Contexts

| Context | DOM Access | Chrome APIs | Fetch/CORS | Use For |
|---------|------------|-------------|------------|---------|
| Service Worker | No | Full | Extension's `host_permissions` | API calls, events, orchestration |
| Content Script | Yes | `runtime`, `storage` only | Page's CORS policy | DOM scanning, page analysis |
| Popup | Own only | Full | Extension's `host_permissions` | User interaction |

**Data flow:** Content script scans DOM → sends results to service worker via `chrome.runtime.sendMessage()` → service worker handles API calls and Chrome API logic → can message back to content script or update popup

---

## Event Hooks

| Event | API |
|-------|-----|
| Navigation | `chrome.tabs.onUpdated` |
| Page load complete | `chrome.webNavigation.onCompleted` |
| Email opened | Content script + MutationObserver |
| Password input | `input` event on `[type="password"]` |

## Security

- No API keys in extension code
- HTTPS only
- Validate content script data
- Password checking = client-side only

---

## Setup

```bash
npm install
```

**Load in Chrome:**
1. `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select `Extension/` folder

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
