# BrowseShield

**Email and Website Security Assessment Platform**

A Chrome browser extension and web portal that provides real-time security assessments for websites and emails. Visual risk indicators, confidence scores, and historical safety tracking help users stay safe online.

---

## Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Real-Time Site Assessment** | Extension scans pages and displays a risk ring (safe/suspicious/unsafe) with confidence score | Implemented |
| **Email Scanning** | Extracts sender, subject, links, and attachments from Gmail and Outlook for threat analysis | Implemented |
| **Web Dashboard** | Account holders view historical data and monitor safety ratings | In Progress |
| **Multi-User Accounts** | Family/team structure — one Account Holder manages sub-user accounts | In Progress |
| **Password Strength Checker** | Real-time feedback on password security via the Portal wiki page | Implemented |

### Stretch Goals

- [ ] Real-time dashboard updates (WebSocket)
- [ ] Email scanning
- [ ] Online security wiki/education section
- [ ] Opt-in ad blocking

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Browser        │────>│  Backend API    │────>│  Database        │
│  Extension      │<────│  (Flask)        │<────│  (PostgreSQL)    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                        │  ML / Detection │
                        │  Engine         │
                        │                 │
                        └────────┬────────┘
                                 │
┌─────────────────┐              │
│                 │              │
│  Web Portal     │<─────────────┘
│  (Flask)        │
│                 │
└─────────────────┘
```

### Components

| Component | Tech | Owner | Details |
|-----------|------|-------|---------|
| [Browser Extension](Extension/) | JavaScript, Chrome MV3 | Jackson | Real-time site/email scanning, risk popup, auth |
| [Web Portal](Portal/) | Python/Flask, Jinja2 | Dane | Dashboard, user management, wiki |
| [Backend API](Backend/) | Python/Flask, PostgreSQL | Mike | REST API, auth, assessment pipeline |
| [Threat Detection](Detection/) | Python | Andy | URL analysis, phishing heuristics, feature extraction |
| [ML Scoring Engine](ML/) | Python, scikit-learn | Mike | Risk classification model, confidence scoring |
| [E2E Tests](e2e/) | Playwright, Docker | Jackson | Full-stack browser testing with fixture pages |
| [Database](Data/) | PostgreSQL 16 | Mike | Schema definitions |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Extension | JavaScript (Manifest V3, Chrome) |
| Portal | Python / Flask / Jinja2 |
| Backend API | Python / Flask / gunicorn |
| Database | PostgreSQL 16 |
| ML | scikit-learn, joblib |
| Testing | Vitest (unit), Playwright (E2E) |
| Deployment | Docker Compose, GitHub Actions |
| Hosting | VPS via Hostinger|

---

## Quick Start

### Docker (full stack)

```bash
cp .env.example .env    # Configure database credentials, JWT secret
docker compose up -d     # Starts portal (:3000), backend (:8000), db (:5432)
```

### Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `Extension/` directory

### E2E Tests

```bash
cd e2e && ./run.sh
```

See [e2e/README.md](e2e/README.md) for details. Reports are viewable in the Portal at `/debug/e2e/results`.

---

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `deploy.yml` | Push to `main` | SSH to VPS, build & deploy Docker stack, run health checks |
| `e2e-tests.yml` | Push to `testing/auto-browser` or manual | Run Playwright E2E suite on VPS, upload report artifacts |

---

## Course Information

**Course:** IT4970W - Capstone Project
**Term:** Spring 2026
**Team:** Dane (Lead), Andy, Mike, Jackson

---

*Last Updated: April 2026*
