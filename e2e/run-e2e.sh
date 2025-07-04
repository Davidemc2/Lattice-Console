#!/bin/bash
set -e

# Start backend
pnpm --filter @lattice-console/backend dev &
BACKEND_PID=$!

# Start frontend
pnpm --filter @lattice-console/frontend dev &
FRONTEND_PID=$!

# Start desktop app
pnpm --filter @lattice-console/desktop dev &
DESKTOP_PID=$!

# Wait for services to be ready
function wait_for_port() {
  local port=$1
  local name=$2
  echo "Waiting for $name on port $port..."
  while ! nc -z localhost $port; do sleep 1; done
  echo "$name is up!"
}

wait_for_port 3001 "Backend API"
wait_for_port 3000 "Frontend"
wait_for_port 3002 "Desktop App"

# Run E2E tests
npx playwright test

# Kill all services
kill $BACKEND_PID $FRONTEND_PID $DESKTOP_PID 