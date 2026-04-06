# BrowseShield - Backend API

RESTful API that powers the BrowseShield extension and portal. Handles authentication, URL/email assessment, and serves as the bridge between the extension, detection engine, and ML model.

**Owner:** Mike

---

## Tech Stack

- **Framework:** Flask (Python)
- **Server:** gunicorn (port 8000)
- **Database:** PostgreSQL 16 (connection pooling via psycopg2)
- **Auth:** JWT (access + refresh tokens), bcrypt password hashing
- **ML:** scikit-learn model loaded at startup via joblib

## Directory Structure

```
Backend/
├── app.py                  # Flask app factory, blueprint registration
├── config.py               # Configuration (suspicious TLDs, known brands, shortener domains)
├── Dockerfile              # Python 3.12-slim, gunicorn entrypoint
├── requirements.txt
├── routes/
│   ├── assess.py           # POST /v1/assess, POST /v1/assess/email
│   ├── auth.py             # POST /v1/auth/login, /logout, /refresh
│   ├── dashboard.py        # Dashboard data endpoints
│   └── metrics.py          # Metrics endpoint
├── services/
│   ├── risk_engine.py      # 21-rule heuristic scoring engine
│   ├── features.py         # URL feature extraction
│   └── scoring_service.py  # Merges heuristic + ML scores
├── db/
│   ├── models.py           # SQLAlchemy models
│   ├── connection.py       # PostgreSQL connection pool
│   └── queries.py          # SQL queries
└── utils/
    └── auth.py             # JWT decorators, token validation
```

## API Endpoints

### Assessment

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| `POST` | `/v1/assess` | Submit URL + scan data for risk assessment | Implemented |
| `POST` | `/v1/assess/email` | Submit email metadata for assessment | Stubbed (TODO) |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/auth/login` | Login, returns access + refresh tokens |
| `POST` | `/v1/auth/logout` | Invalidate refresh token |
| `POST` | `/v1/auth/refresh` | Rotate refresh token, issue new access token |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/v1/metrics` | Analytics data |
| `GET/POST` | `/v1/dashboard` | Portal dashboard data |

## Assessment Pipeline

```
Request → Validation → Feature Extraction → Heuristic Scoring → ML Prediction → Score Blending → DB Logging → Response
```

1. **Validation** — URL format, scan_data structure
2. **Feature extraction** — URL structure, form data, link analysis (via `services/features.py`)
3. **Heuristic scoring** — 21 rules evaluated, each weighted 0.05-0.20 (via `services/risk_engine.py`)
4. **ML prediction** — scikit-learn model classifies phishing probability; falls back to heuristic-only on failure
5. **Score blending** — Combines heuristic score (0-1.0) with ML probability (via `services/scoring_service.py`)
6. **DB logging** — Stores analysis request, extracted features, detection result
7. **Response** — Returns `{safety, confidence, reasons, assessed_at}`

## Risk Scoring

### Risk Levels

| Classification | Score Range | Description |
|----------------|-------------|-------------|
| **safe** | < 0.3 | No significant risk indicators |
| **suspicious** | 0.3 - 0.6 | Some red flags detected |
| **unsafe** | >= 0.6 | High-risk indicators present |

### Confidence

Scales with number of heuristic rules triggered (range: 40-95%).

### Heuristic Rules (21 total)

Key rules and their weights:

| Rule | Weight |
|------|--------|
| IP address in URL | 0.20 |
| Brand impersonation in subdomain | 0.20 |
| Password form submitting externally | 0.20 |
| @ symbol in URL | 0.15 |
| Punycode / homograph characters | 0.15 |
| Suspicious TLD | 0.10 |
| Link shortener usage | 0.10 |
| External favicon | 0.10 |
| Hidden iframes | 0.10 |
| Excessive subdomains / hyphens | 0.10 |
| Thin page with login form | 0.10 |

## Authentication

- **Access tokens:** Short-lived JWT (default 15 min, configurable)
- **Refresh tokens:** Long-lived (default 7 days), stored hashed in DB
- **Token rotation:** New refresh token issued on each refresh call
- **Extension integration:** chrome.alarms triggers refresh 2 min before expiry

## Setup

### Docker (recommended)

```bash
docker compose up -d backend    # Starts on port 8000
```

### Local

```bash
cd Backend
pip install -r requirements.txt
gunicorn app:create_app() --bind 0.0.0.0:8000
```

Requires a running PostgreSQL instance and `.env` configuration (see `.env.example` in project root).

## Dependencies

Flask, psycopg2-binary, python-dotenv, PyJWT, bcrypt, scikit-learn, numpy, joblib, python-whois
