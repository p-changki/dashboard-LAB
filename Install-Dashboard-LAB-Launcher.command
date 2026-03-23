#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

pause_and_exit() {
  local exit_code="${1:-0}"
  echo
  read -r -p "Press Enter to close this window..." _
  exit "$exit_code"
}

handle_error() {
  local exit_code=$?
  echo
  echo "dashboard-LAB launcher install failed."
  echo "Read the messages above for the exact step that failed."
  pause_and_exit "$exit_code"
}

trap handle_error ERR

cd "$REPO_ROOT"

echo "dashboard-LAB launcher setup"
echo "This creates a clickable macOS app in ~/Applications."
echo

node "$REPO_ROOT/scripts/install-macos-launcher.mjs"

echo
echo "Launcher installed."
echo "Open ~/Applications/dashboard-LAB Dev.app to start the local app without typing pnpm dev."

pause_and_exit 0
