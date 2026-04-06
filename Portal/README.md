# BrowseShield - Web Portal

Web dashboard for account management, historical data visualization, and multi-user safety monitoring.

**Owner:** Dane

---

## Tech Stack

- **Framework:** Flask (Python)
- **Server:** gunicorn (port 3000)
- **Auth:** Flask-Login, Flask-Bcrypt
- **Database:** Flask-SQLAlchemy (PostgreSQL)
- **Templates:** Jinja2 / HTML

## Directory Structure

```
Portal/
├── app.py                  # Flask app factory, login manager, route registration
├── config.py               # Configuration
├── Dockerfile              # Python 3.12-slim, gunicorn entrypoint
├── requirements.txt
├── models/
│   └── user.py             # User model (SQLAlchemy)
├── routes/
│   ├── auth.py             # Login, logout, registration
│   └── debug.py            # E2E test report viewers
├── templates/
│   ├── index.html          # Home / dashboard
│   ├── dashboard.html      # Dashboard view
│   ├── login.html          # Login page
│   ├── register.html       # Registration page
│   └── wiki.html           # Online safety wiki + password strength checker
├── static/
│   └── logo.png
└── utils/
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home / dashboard |
| `/wiki` | Online safety wiki with scoring system explainer, safety tips, scam examples, and password strength checker |
| `/auth/login` | User login |
| `/auth/logout` | User logout |
| `/auth/register` | New account registration |
| `/debug/e2e/results` | Playwright HTML test report viewer (login required) |
| `/debug/e2e/reports` | File browser with pretty-printed JSON viewer for assessment reports (login required) |

## Setup

### Docker (recommended)

```bash
docker compose up -d portal    # Starts on port 3000
```

### Local

```bash
cd Portal
pip install -r requirements.txt
python app.py                   # Dev server on port 3000
```

Requires a running PostgreSQL instance and `.env` configuration.

## Current Status

- Auth scaffolding (login, logout, registration) functional
- E2E test report viewing functional
- Wiki page with safety tips and password checker functional
- Dashboard UI in progress

## Dependencies

Flask, Flask-Login, Flask-Bcrypt, Flask-SQLAlchemy, psycopg2-binary, requests
