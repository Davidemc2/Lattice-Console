#!/bin/bash
set -e

# Helper: check if port is free
function check_port_free() {
  local port=$1
  if lsof -i :$port >/dev/null 2>&1; then
    echo "[ERROR] Port $port is already in use. Please free it before running E2E tests." >&2
    exit 1
  fi
}

# Check all required ports
check_port_free 3000
check_port_free 3001
check_port_free 3002

# Start backend
pnpm --filter @lattice-console/backend dev &
BACKEND_PID=$!
echo "[INFO] Started backend (PID $BACKEND_PID)"

# Start frontend
pnpm --filter @lattice-console/frontend dev &
FRONTEND_PID=$!
echo "[INFO] Started frontend (PID $FRONTEND_PID)"

# Start desktop app
pnpm --filter lattice-desktop dev &
DESKTOP_PID=$!
echo "[INFO] Started desktop app (PID $DESKTOP_PID)"

# Wait for services to be ready
function wait_for_http() {
  local url=$1
  local name=$2
  local max_retries=60
  local count=0
  echo "[INFO] Waiting for $name at $url..."
  until curl -sSf "$url" > /dev/null; do
    sleep 1
    count=$((count+1))
    if [ $count -ge $max_retries ]; then
      echo "[ERROR] $name did not become ready at $url after $max_retries seconds." >&2
      kill $BACKEND_PID $FRONTEND_PID $DESKTOP_PID || true
      exit 1
    fi
  done
  echo "[INFO] $name is up!"
}

wait_for_http http://localhost:3001/health "Backend API"
wait_for_http http://localhost:3000/ "Frontend"
wait_for_http http://localhost:3002/ "Desktop App"

# Run E2E tests
npx playwright test

# Kill all services
kill $BACKEND_PID $FRONTEND_PID $DESKTOP_PID 