# dashboard-LAB

Local-first AI workbench for turning call recordings into practical product documents.

Boilerplate transition docs:
- `docs/DASHBOARD_LAB_BLUEPRINT.md`
- `docs/DASHBOARD_LAB_MIGRATION_PLAN.md`

Core flow:
- record a client call
- transcribe it locally with Whisper
- generate PRD and support docs
- keep the workflow on your machine
- connect your own folders during first-run onboarding

Current stack:
- Next.js 15
- Electron desktop shell
- local `whisper` or `whisper-cli`
- `ffmpeg`
- `claude` and/or `codex` CLI for document generation

## Who This Is For

- solo founders collecting product requests from calls
- agencies writing delivery docs from client conversations
- PMs or operators who want local, privacy-first meeting-to-PRD workflows

## Quick Start For macOS

The easiest path for non-developers is:

1. Install Homebrew once: https://brew.sh
2. Double-click `Run-Dashboard-LAB.command`

What the launcher does:
- installs `node`, `ffmpeg`, `whisper-cpp` if missing
- installs JavaScript dependencies with `pnpm`
- downloads `models/ggml-base.bin` if missing
- starts the local app
- opens the browser automatically

## CLI Setup

```bash
pnpm setup:mac
pnpm doctor
pnpm launch
```

## CLI Setup For Windows / Linux

Windows and Linux are now supported as experimental desktop targets.

```bash
pnpm install
pnpm doctor
pnpm launch
```

What you still need to install yourself:
- Node.js 22+
- `pnpm`
- `ffmpeg`
- `whisper` or `whisper-cli`
- `models/ggml-base.bin`

## Desktop App

Electron development mode:

```bash
pnpm assets:icon
pnpm desktop:dev
```

Desktop build output:

```bash
pnpm assets:icon
pnpm desktop:build
```

macOS desktop artifacts:

```bash
pnpm assets:icon
pnpm desktop:dist:mac
```

Windows desktop artifacts:

```bash
pnpm assets:icon
pnpm desktop:dist:win
```

Linux desktop artifacts:

```bash
pnpm assets:icon
pnpm desktop:dist:linux
```

GitHub release from the current version tag:

```bash
git tag v0.1.2
git push origin v0.1.2
```

That tag triggers the release workflow and uploads macOS, Windows, and Linux artifacts to GitHub Releases.

Detailed notes:
- `docs/ELECTRON_DESKTOP_PLAN.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

On first launch, the dashboard inspects your local environment and lets you confirm:
- project root
- Obsidian vault path
- PRD output directory
- CS context directory

## Requirements

Required:
- Node.js
- `ffmpeg`
- `whisper` or `whisper-cli`
- `models/ggml-base.bin`

Needed for AI document generation:
- `claude` CLI or `codex` CLI

Notes:
- speech-to-text runs locally
- `whisper-cpp` needs a ggml model file
- `m4a` and `webm` inputs are converted through `ffmpeg` before transcription

## Doctor

Use the local environment checker before reporting issues:

```bash
pnpm doctor
```

It verifies:
- system prerequisites
- installed CLI tools
- local model presence
- dependency install status

If `pnpm install` reports ignored build scripts for packages like `node-pty` or `sharp`, run:

```bash
pnpm approve-builds
pnpm rebuild electron node-pty
```

Then allow the packages you want to use locally.

## Current Product Surface

- `Call to PRD`: call recording -> transcript -> PRD + support docs
- `AI Skills`: reusable AI workflows
- `Terminal`: local terminal sessions inside the dashboard
- `Projects`, `Doc Hub`, `Info Hub`, `System`, `CS Helper`

## Privacy

This app is designed for local use.

Before sharing the repository publicly, do not include:
- customer recordings
- transcripts
- generated documents with client information
- local state files
- API keys or `.env` files

## Development

```bash
pnpm dev
pnpm assets:icon
pnpm desktop:dev
pnpm type-check
pnpm lint
```

## Open Source Notes

- The desktop app is stable on macOS and experimental on Windows/Linux.
- Release artifacts are built locally into `release/`.
- This repository uses the MIT license.

The local runner prints a dynamic app URL and terminal WebSocket port:

```bash
pnpm launch
```
