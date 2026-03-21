#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

bash "$REPO_ROOT/scripts/bootstrap-macos.sh"
node "$REPO_ROOT/scripts/launch-local.mjs"
