# BrowseShield - Threat Detection

Feature extraction pipeline for URL and page analysis. Produces the feature vectors consumed by both the heuristic risk engine and the ML classification model.

**Owner:** Andy

---

## Directory Structure

```
Detection/
├── features/
│   ├── feature_extractor.py    # Main orchestrator — aggregates all feature modules
│   ├── url_features.py         # URL structure analysis (IP, length, prefix/suffix, HTTPS token)
│   ├── domain_checks.py        # Domain reputation (age, DNS records, registration length)
│   ├── form_features.py        # Form behavior analysis (SFH, email submission, page DOM indicators)
│   └── heuristic_features.py   # Additional heuristic flags (shortener, subdomains, etc.)
├── interface/
│   └── detector_contract.md    # Feature interface spec — encoding, required order, sources
├── scoring/
│   └── risk_engine.py          # Risk scoring engine
└── README.md
```

## How It Works

`feature_extractor.extract_features(url, page_data)` coordinates all extraction:

1. **URL features** — Analyzes URL structure (IP address presence, length, prefix/suffix patterns, HTTPS token usage)
2. **Domain features** — Checks domain reputation (age, DNS records, registration duration via whois)
3. **Form features** — Evaluates page DOM data from the extension (form handlers, iframes, popups, right-click behavior, external resource ratio)
4. **Heuristic features** — Additional indicators (link shorteners, subdomain depth, etc.)

Returns a feature dictionary used by:
- **Backend risk engine** (`Backend/services/risk_engine.py`) — 21 weighted heuristic rules
- **ML predictor** (`ML/predictor.py`) — 30-feature vector for scikit-learn model

## Feature Encoding

Features use a ternary encoding:

| Value | Meaning |
|-------|---------|
| `1` | Legitimate indicator |
| `0` | Suspicious / Neutral |
| `-1` | Phishing indicator |

See `interface/detector_contract.md` for the full feature specification, required ordering, and example payloads.

## Integration

```
Extension (content.js)          Detection Module              Backend
─────────────────────    ──────────────────────────    ──────────────────
Scans page DOM      →   feature_extractor.py      →   risk_engine.py (heuristic)
  forms, links,          ├── url_features.py            scoring_service.py (blend)
  security indicators    ├── domain_checks.py      →   ML/predictor.py (classification)
                         ├── form_features.py
                         └── heuristic_features.py
```
