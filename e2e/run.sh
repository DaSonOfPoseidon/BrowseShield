#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.e2e.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
  echo -e "\n${YELLOW}Tearing down test infrastructure...${NC}"
  docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
}

# Always clean up on exit
trap cleanup EXIT

echo -e "${YELLOW}[1/5] Starting test infrastructure...${NC}"
docker compose -f "$COMPOSE_FILE" up -d --build

echo -e "${YELLOW}[2/5] Waiting for backend health...${NC}"
for i in $(seq 1 30); do
  # Backend responds on any route (even 404 means the server is up)
  if curl -sf -o /dev/null -w '' http://localhost:8001/v1/auth/login -X POST \
       -H 'Content-Type: application/json' -d '{}' 2>/dev/null; then
    echo -e "${GREEN}  Backend is healthy${NC}"
    break
  fi
  # Also accept 400 — server is running, just rejected the empty body
  status=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8001/v1/auth/login -X POST \
       -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo "000")
  if [ "$status" != "000" ]; then
    echo -e "${GREEN}  Backend is healthy (HTTP $status)${NC}"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "${RED}  Backend failed to start after 60s${NC}"
    docker compose -f "$COMPOSE_FILE" logs backend-test
    exit 1
  fi
  sleep 2
done

# Verify fixtures server is up
for i in $(seq 1 10); do
  if curl -sf http://localhost:9090/safe-baseline.html > /dev/null 2>&1; then
    echo -e "${GREEN}  Fixtures server is healthy${NC}"
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo -e "${RED}  Fixtures server failed to start${NC}"
    docker compose -f "$COMPOSE_FILE" logs fixtures
    exit 1
  fi
  sleep 1
done

echo -e "${YELLOW}[3/5] Installing test dependencies...${NC}"
cd "$SCRIPT_DIR"
npm install --silent 2>&1 | tail -1
npx playwright install chromium 2>&1 | tail -3

echo -e "${YELLOW}[4/5] Running E2E tests...${NC}"
TEST_EXIT=0
npx playwright test || TEST_EXIT=$?

echo -e "${YELLOW}[5/5] Done.${NC}"

if [ "$TEST_EXIT" -ne 0 ]; then
  echo -e "\n${RED}Some tests failed. See report: $SCRIPT_DIR/reports/html/index.html${NC}"
  exit "$TEST_EXIT"
fi

echo -e "\n${GREEN}All tests passed! Report: $SCRIPT_DIR/reports/html/index.html${NC}"
