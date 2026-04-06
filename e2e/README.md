# E2E Tests

Playwright-based end-to-end tests for the BrowseShield browser extension. Tests run against a dedicated Docker infrastructure with seeded data and local fixture pages.

## Quick Start

```bash
cd e2e
./run.sh
```

`run.sh` handles everything: starts containers, waits for health checks, installs dependencies, runs Playwright, and tears down on exit.

## Infrastructure

Defined in `docker-compose.e2e.yml`:

| Service | Description | Port |
|---------|-------------|------|
| `db-test` | PostgreSQL 16 with seeded data | 5433 |
| `backend-test` | BrowseShield API | 8001 |
| `fixtures` | Nginx serving test HTML pages | 9090 |

## Test Configuration

`config/test-sites.yml` defines the test matrix:

- **Fixture sites** (`localhost:9090`) — controlled HTML pages testing specific detection scenarios (safe baseline, phishing, suspicious indicators, IP address access)
- **Live sites** — smoke tests against real sites (Google, Wikipedia, Example.com)

### Assertion Modes

| Mode | Behavior |
|------|----------|
| `exact` | Safety classification must match `expected_safety` exactly |
| `smoke` | Only verifies a result is returned without error |

## Reports

After a test run, reports are written to `reports/`:

| File | Description |
|------|-------------|
| `html/index.html` | Playwright interactive HTML report |
| `results.json` | Full Playwright JSON results |
| `assessment-summary-*.json` | Custom per-URL assessment table (safety, confidence, score, status) |

### Viewing Reports in the Portal

Reports are served on the Portal (login required):

- **`/debug/e2e/results`** — Playwright HTML report
- **`/debug/e2e/reports`** — File browser with pretty-printed JSON viewer

## Directory Structure

```
e2e/
├── run.sh                    # Orchestrator script
├── playwright.config.js      # Playwright configuration
├── package.json
├── docker-compose.e2e.yml    # Test infrastructure
├── config/
│   └── test-sites.yml        # Test site definitions
├── fixtures/                 # Nginx + test HTML pages
├── tests/
│   ├── scan-flow.spec.js     # Main test suite
│   └── helpers/
│       ├── extension-loader.js  # Loads real Chrome extension into Playwright
│       ├── auth.js              # Login helper for extension popup
│       ├── assessment-reader.js # Reads assessment results from extension
│       └── reporter.js          # Custom assessment summary reporter
└── reports/                  # Generated after a run
    ├── html/
    ├── results.json
    └── assessment-summary-*.json
```
