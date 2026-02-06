# BrowseGuard

**Email and Website Security Assessment Platform**

A browser extension and web portal that provides real-time security assessments for websites and emails, helping users stay safe online with visual risk indicators, confidence scores, and historical safety tracking.

---

## Project Overview

### Core Features

| Feature | Description |
|---------|-------------|
| **Risk Assessment Pop-up** | Visual indicator (green/yellow/red) with confidence score appears when visiting websites or opening emails |
| **Web Dashboard** | Account holders view historical data, manage users, and monitor safety ratings |
| **Multi-User Accounts** | Family/team structure—one Account Holder can create sub-user accounts (like streaming services) |
| **Per-User Safety Ratings** | Aggregated safety score based on individual browsing and email history |
| **Password Strength Checker** | Real-time feedback on password security in web forms |

### Stretch Goals

- [ ] Real-time dashboard updates (WebSocket)
- [ ] Parental controls & site blocking by user
- [ ] Online security wiki/education section
- [ ] Opt-in ad blocking

---

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Browser        │────▶│  Backend API    │────▶│  Database       │
│  Extension      │◀────│  Services       │◀────│                 │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │  ML/Scoring     │
                        │  Engine         │
                        │                 │
                        └─────────────────┘
                                 │
┌─────────────────┐              │
│                 │              │
│  Web Portal     │◀─────────────┘
│  Dashboard      │
│                 │
└─────────────────┘
```

### Components

| Component | Description | Owner |
|-----------|-------------|-------|
| Browser Extension | Chrome/Edge/Firefox extension for real-time site assessment | Jackson |
| Web Portal | React/Vue dashboard for account management and history | Dane |
| Backend API | RESTful API services, auth, data layer | Mike |
| Threat Detection | URL analysis, phishing heuristics, reputation checking | Andy |
| ML Scoring Engine | Risk models, confidence scoring, anomaly detection | Mike |

---

## Team & Responsibilities

### Jackson – Extension Engineer
| Area | Responsibilities |
|------|------------------|
| Architecture | Browser extension structure, manifest configuration, event hooks |
| UI/UX | Risk assessment pop-up, visual indicators (color coding, confidence display) |
| Integration | Secure extension ↔ backend API communication |
| Security | Password strength detection, insecure input warnings (client-side) |
| Quality | Extension testing, sandboxing, cross-browser compatibility |

### Dane – Web Portal & Team Lead
| Area | Responsibilities |
|------|------------------|
| Frontend | Web portal architecture, dashboard UI/UX |
| Auth | Account Holder & sub-user authentication flows |
| Visualization | Historical data charts, safety rating displays |
| Features | Parental controls UI, content management (stretch) |
| Leadership | Team coordination, sprint planning, integration oversight |

### Andy – Security Engineer
| Area | Responsibilities |
|------|------------------|
| Detection | Threat detection service implementation |
| Heuristics | Phishing/malware detection rules engine |
| Reputation | URL/domain reputation checking logic |
| Review | Security architecture review, penetration testing |
| Compliance | Privacy requirements, user guidance documentation |

### Mike – Data & Backend Engineer
| Area | Responsibilities |
|------|------------------|
| Backend | API architecture, endpoint implementation |
| Data Layer | Database schema design, data access patterns |
| ML Models | Risk scoring models, confidence calculations |
| Analytics | Safety rating aggregation, anomaly detection |
| Pipeline | Data ingestion, model evaluation, performance tuning |

---

## Repository Structure

```
Capstone Project/
├── README.md                 # This file
│
├── Extension/                # Browser extension (Jackson)
│   ├── README.md
│   ├── manifest.json
│   ├── src/
│   └── docs/
│
├── Portal/                   # Web dashboard (Dane)
│   ├── README.md
│   ├── src/
│   └── public/
│
├── Backend/                  # API services (Mike)
│   ├── README.md
│   ├── src/
│   ├── migrations/
│   └── tests/
│
├── Detection/                # Threat detection (Andy)
│   ├── README.md
│   ├── src/
│   ├── rules/
│   └── data/
│
├── ML/                       # Scoring models (Mike)
│   ├── README.md
│   ├── models/
│   ├── notebooks/
│   └── evaluation/
│
└── docs/                     # Shared documentation
    ├── api-spec.md
    ├── architecture.md
    └── security.md
```

---

## Risk Scoring System

### Risk Levels

| Level | Color | Indicator | Description |
|-------|-------|-----------|-------------|
| Safe | 🟢 Green | `#22C55E` | Known trusted domain, verified sender |
| Uncertain | 🟡 Yellow | `#F59E0B` | New/unknown, insufficient data |
| Suspicious | 🟠 Orange | `#F97316` | Some red flags detected |
| Malicious | 🔴 Red | `#EF4444` | Known threat, blocklist match |

### Confidence Score

- Scale: 0-100%
- Factors: Data availability, signal strength, model certainty
- Display: Percentage or 5-star rating (TBD)

---

## API Overview

### Extension Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/assess/url` | Submit URL for risk assessment |
| `POST` | `/api/v1/assess/email` | Submit email metadata for assessment |
| `GET` | `/api/v1/reputation/{domain}` | Get cached domain reputation |

### Portal Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Account holder authentication |
| `POST` | `/api/v1/auth/register` | New account registration |
| `GET` | `/api/v1/users` | List sub-users for account |
| `POST` | `/api/v1/users` | Create sub-user |
| `GET` | `/api/v1/history/{userId}` | Get browsing/email history |
| `GET` | `/api/v1/stats/{userId}` | Get safety rating & stats |

### Device Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/devices/register` | Link extension to user account |
| `DELETE` | `/api/v1/devices/{deviceId}` | Unlink device |

---

## Tech Stack (Proposed)

| Layer | Technology | Notes |
|-------|------------|-------|
| Extension | JavaScript | Manifest V3 (cross-browser) |
| Portal Frontend | TBD | Dane's call |
| Backend API | Node.js/Express or Python/FastAPI | TBD |
| Database | PostgreSQL | Relational, ACID and JSONB |
| Cache | Redis | Session storage, rate limiting |
| ML | TBD | TBD |
| Hosting | TBD | AWS, GCP, self-hosted |

---

## Development Workflow

### Branch Strategy

```
main              # Production-ready code
├── develop       # Integration branch
├── feature/*     # New features
└── bugfix/*      # Bug fixes
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement feature with tests
3. Open PR with description and screenshots
4. Code review by at least one team member
5. Merge to `develop` after approval

### Communication

- **Weekly Sync:** Tuesday 6pm
- **Async Updates:** MAD J Discord
- **Documentation:** Update relevant README when adding features

---

## Resources

- [Chrome Extension Docs (MV3)](https://developer.chrome.com/docs/extensions/mv3/)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
- [PhishTank API](https://phishtank.org/developer_info.php)
- [Google Safe Browsing API](https://developers.google.com/safe-browsing)

---

## Course Information

**Course:** IT4970W – Capstone Project
**Term:** Spring 2026
**Team:** Dane (Lead), Andy, Mike, Jackson

---

*Last Updated: February 2026*
