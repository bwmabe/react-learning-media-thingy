#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

PROJECT_ROOT=$(pwd)
DB_PATH="${PROJECT_ROOT}/test-data/test.db"

echo "Installing backend dependencies..."
(cd backend && npm install)

echo "Installing frontend dependencies..."
(cd frontend && npm install)

echo "Starting backend with DB: ${DB_PATH}"
# Start the backend in the background
# The DATABASE_NAME env var is used by server.ts to connect to the specified db.
# We redirect stdout/stderr to a file to prevent it from cluttering the terminal,
# but still allow checking for errors.
# 'exec' replaces the current shell with the specified command, ensuring clean process management.
(cd backend && DATABASE_NAME="${DB_PATH}" npm run dev > backend.log 2>&1) &
BACKEND_PID=$!
echo "Backend started with PID ${BACKEND_PID}. Output logged to backend/backend.log"

# Give the backend a moment to start up
sleep 5

echo "Starting frontend..."
(cd frontend && npm start)

echo "To stop the backend, run: kill ${BACKEND_PID}"
wait $BACKEND_PID # Wait for the backend process if the frontend exits
