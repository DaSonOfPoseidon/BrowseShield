# BrowseShield Extension - Development Notes

## Architecture Decisions Log

### Pop-up Style Decision: Content Script Overlay vs Browser Action

**Honey-style (auto-appearing overlay):**
- Requires content script injection
- More intrusive but higher visibility
- Can appear contextually (e.g., only on suspicious sites)
- Complex: must handle z-index battles, varying site layouts

**Traditional browser action popup:**
- User clicks icon to see assessment
- Less intrusive, cleaner
- Easier to implement
- Badge can show quick status (green/yellow/red dot)

**Recommendation:** Start with badge + traditional popup. Add overlay for high-risk alerts only.

---

## Email Detection Strategy

### Gmail
- Look for `div[role="main"]` with email content
- Email opened: URL contains `#inbox/` followed by message ID
- Use MutationObserver to detect when email body loads

### Outlook Web
- URL pattern: `outlook.office.com/mail/...`
- Email pane selector varies by version
- May need to handle both classic and new UI

### Yahoo Mail
- Less common but similar pattern
- URL-based detection + DOM observation

**Note:** Email content is NOT accessible due to CSP. You can only detect:
- That an email is open
- The URL/page context
- Links visible in the rendered DOM (with caveats)

---

## Password Field Detection

```javascript
# Pseudocode approach:
# 1. Query all input[type="password"] on page
# 2. Attach input event listener to each
# 3. On input, analyze strength locally (DON'T send password to backend!)
# 4. Display strength indicator near field

# Libraries to consider:
# - zxcvbn (Dropbox) - comprehensive, ~400KB
# - owasp-password-strength-test - lighter, less nuanced
```

**Privacy Critical:** Password analysis MUST be client-side only!

---

## Risk Indicator Color Scheme

| Status | Color | Hex | Use Case |
|--------|-------|-----|----------|
| Safe/Known | Green | `#22C55E` | Trusted domains, verified emails |
| Uncertain | Yellow/Amber | `#F59E0B` | New domains, can't verify, mixed signals |
| Suspicious | Orange | `#F97316` | Some red flags, proceed with caution |
| Malicious | Red | `#EF4444` | Known bad, blocklist match |

### Confidence Score Display Options

**Option A: Percentage**
- `85% confident`
- Clear, numeric

**Option B: Stars (1-5)**
- ★★★★☆
- Familiar, quick to read
- Loses precision

**Option C: Progress bar with color**
- Visual + numeric
- Takes more space

---

## API Integration Notes

### Authentication Flow (Device Registration)
```
1. User installs extension
2. Extension prompts: "Link to BrowseShield account"
3. Opens web portal login in new tab
4. After login, portal passes token back to extension via:
   - Custom protocol handler, OR
   - Extension messaging from web page (if on same domain)
5. Extension stores token securely in chrome.storage.local
```

### Caching Strategy
- Cache "safe" assessments for 24 hours (configurable)
- Never cache "malicious" long-term (could change)
- Cache miss → API call → display result → cache
- Show cached result immediately, refresh in background

### Offline Behavior
- Show "offline" indicator
- Use cached results when available
- Queue assessments for when back online?

---

## Known Challenges & Solutions

### Challenge: Pop-up closes when user clicks away
**Solution:** Use `chrome.storage` to persist state. Reload state when popup opens.

### Challenge: Content script can't access extension APIs directly
**Solution:** Message passing. Content script sends message → background script handles API call → sends response back.

### Challenge: Some sites block content script injection (CSP)
**Solution:** Can't fully override. Graceful degradation - show assessment in popup only.

### Challenge: Performance on page load
**Solution:** Don't block page. Run assessment async. Show indicator when ready.

---

## Testing Sandboxes

### Sites to Test
- `example.com` - known safe baseline
- `httpforever.com` - HTTP-only site
- `badssl.com` - Various SSL configurations
- `phishtank.org` - Known phishing examples (careful!)
- Gmail, Outlook, Yahoo - email detection

### Browser Testing Matrix
| Browser | Engine | Extension API |
|---------|--------|---------------|
| Chrome | Chromium | `chrome.*` |
| Edge | Chromium | `chrome.*` / `browser.*` |
| Firefox | Gecko | `browser.*` (Promise-based) |
| Safari | WebKit | Requires separate build |

**Cross-browser tip:** Use `browser.*` API with webextension-polyfill for compatibility.

---

## Sprint/Milestone Ideas (AI Suggested)

### Milestone 1: Foundation
- [ ] `manifest.json` complete and loadable
- [ ] Basic popup displays (hardcoded content)
- [ ] Content script injects and logs to console
- [ ] Background service worker runs

### Milestone 2: Core Functionality
- [ ] Navigation detection triggers assessment flow
- [ ] API client connects to backend (mock or real)
- [ ] Popup displays received risk score
- [ ] Color coding works

### Milestone 3: Polish
- [ ] Password strength detection
- [ ] Email platform detection
- [ ] Caching layer
- [ ] Error states and offline handling

### Milestone 4: Testing & Hardening
- [ ] Unit tests for core logic
- [ ] Cross-browser testing
- [ ] Security review
- [ ] Performance profiling

---

## Questions for Team / Prof

- [ ] What backend stack is the portal team using? (Affects API client design)
- [ ] Do we need to support Safari? (Significant extra work)
- [ ] Privacy policy requirements for storing browsing history?
- [ ] What email platforms are must-have vs nice-to-have?
- [ ] Real-time updates: WebSocket vs polling vs Server-Sent Events?

---

## Useful Code Snippets (Reference Only)

### Basic Message Passing Pattern
```javascript
# Content script → Background
# chrome.runtime.sendMessage({type: "ASSESS_URL", url: window.location.href})

# Background script listener
# chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
#   if (message.type === "ASSESS_URL") {
#     assessUrl(message.url).then(sendResponse)
#     return true  # Required for async response
#   }
# })
```

### Badge Color Update
```javascript
# chrome.action.setBadgeBackgroundColor({color: "#22C55E"})  # Green
# chrome.action.setBadgeText({text: "✓"})
```

---

## Links & References Bookmark

- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/mv3-migration/)
- [Chrome Extension Samples](https://github.com/GoogleChrome/chrome-extensions-samples)
- [webextension-polyfill](https://github.com/AntoinePlu/webextension-polyfill)
- [Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)

---

---

## API Contract

The extension communicates with a backend API at `https://api.browseshield.dev/v1`. All endpoints use JSON request/response bodies.

### Authentication

#### `POST /v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "dGhpcyBpcyBh...",
  "expires_in": 3600,
  "user": {
    "id": "user-1",
    "email": "user@example.com",
    "name": "Test User"
  }
}
```

#### `POST /v1/auth/logout`

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "message": "Logged out"
}
```

### Assessment

#### `POST /v1/assess`

Requires authentication.

**Request:**
```json
{
  "url": "https://example.com",
  "scan_data": {
    "forms": [
      {
        "action": "https://example.com/login",
        "method": "post",
        "hasPasswordField": true,
        "inputCount": 3
      }
    ],
    "links": { "total": 42, "external": 7 },
    "meta": { "isHttps": true, "title": "Example Page" }
  }
}
```

`url` is always required. `scan_data` is a flexible JSON object — its shape will evolve as the content script scanning changes. The backend should accept it as a generic object rather than validating specific fields.

**Response (200):**
```json
{
  "safety": "suspicious",
  "confidence": 72,
  "reasons": [
    "Page contains a login form",
    "Domain registered recently"
  ],
  "assessed_at": "2026-02-24T14:30:00Z"
}
```

- `safety`: `"safe"` | `"unsafe"` | `"suspicious"`
- `confidence`: integer 0–100

### Error Responses

All errors follow the same shape:
```json
{
  "error": "error_code",
  "message": "Human-readable message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error (missing/invalid fields) |
| 401 | Authentication required or token expired |
| 500 | Server error |

---

*Last Updated: February 2026*
