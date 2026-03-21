#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODEL_PATH="$REPO_ROOT/models/ggml-base.bin"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"

cd "$REPO_ROOT"

echo "[dashboard-lab] macOS bootstrap starting"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[dashboard-lab] This bootstrap currently targets macOS only."
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "[dashboard-lab] Homebrew is required."
  echo "Install it first: https://brew.sh"
  exit 1
fi

ensure_formula() {
  local formula="$1"
  if brew list --formula "$formula" >/dev/null 2>&1; then
    echo "[dashboard-lab] $formula already installed"
  else
    echo "[dashboard-lab] installing $formula"
    brew install "$formula"
  fi
}

ensure_formula node
ensure_formula ffmpeg
ensure_formula whisper-cpp

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[dashboard-lab] preparing pnpm"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.17.1 --activate
  else
    ensure_formula pnpm
  fi
fi

echo "[dashboard-lab] installing node dependencies"
pnpm install

mkdir -p "$REPO_ROOT/models"
if [[ -f "$MODEL_PATH" ]]; then
  echo "[dashboard-lab] whisper model already present"
else
  echo "[dashboard-lab] downloading whisper model"
  curl -L "$MODEL_URL" -o "$MODEL_PATH"
fi

echo "[dashboard-lab] bootstrap complete"
echo "[dashboard-lab] run 'pnpm launch' or double-click Run-Dashboard-LAB.command"
