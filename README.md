# dashboard-LAB

[![CI](https://github.com/p-changki/dashboard-LAB/actions/workflows/ci.yml/badge.svg)](https://github.com/p-changki/dashboard-LAB/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/p-changki/dashboard-LAB)](https://github.com/p-changki/dashboard-LAB/releases)
[![License](https://img.shields.io/github/license/p-changki/dashboard-LAB)](LICENSE)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-111827)

English | [한국어](README.ko.md)

> The local AI workspace for Claude, Codex, and Gemini without living in the terminal.

`dashboard-LAB` is a local-first desktop workspace for people who want to manage projects, docs, customer replies, meeting ops, daily updates, signal writing, and PRD workflows around their own AI CLI tools from one place.

It is positioned as the missing GUI layer around tools like `claude`, `codex`, and similar local AI workflows, especially for people who want developer-style leverage without staying terminal-first all day.

## In 10 Seconds

- Manage your local AI CLI tools through a visual workspace instead of juggling shell commands
- Turn meeting notes, call transcripts, and issue summaries into PRDs and working docs
- Draft customer replies with project context already attached
- Turn fresh signals into post-ready drafts with built-in research and fact checks
- Scan repositories, docs, system state, and daily updates from one dashboard

## Signature Workflows

- `Projects + Doc Hub`: understand the current state of a local repo before doing any AI-assisted work
- `CS Helper`: turn customer messages into project-aware reply drafts and internal notes
- `Meeting Hub`: keep teams, meeting records, and action items aligned around local project context
- `Call → PRD`: turn calls, notes, and issue context into PRDs plus role-specific follow-up docs
- `Info Hub`: check daily refreshed news, trends, package updates, and security signals
- `Signal Writer`: turn curated daily signals into social drafts, angle boards, and supporting research

## Positioning

`dashboard-LAB` is a local AI workspace and operational dashboard first.

It is not a recording-first product, and it does not try to replace the CLI tools themselves.

The main value is giving local AI tooling a practical desktop workspace where projects, documents, system visibility, customer support flows, and PRD generation live together.

## Why It Exists

- Use local AI tools through a practical UI instead of juggling terminal commands all day.
- Help non-developers work through developer-style flows with project context, system visibility, and reusable helpers.
- Keep project management, document work, customer communication, file cleanup, and system actions in one place.
- Read daily refreshed news, trends, dependency updates, and security signals without leaving the workspace.
- Treat recording and transcription as optional workflows, not as the product's main identity.

## Who It Is For

- Founders, operators, PMs, and non-developers who want developer-style leverage from local AI tools
- Developers who want one workspace for project scanning, doc lookup, AI skills, and system helpers
- Anyone who already uses `claude`, `codex`, or similar local tooling and wants a more usable interface around it

## What You Can Do

- `Home`: check CLI tool status, agents, skills, MCP connections, and quick commands
- `AI Skills`: run reusable AI workflows and keep a history of outputs
- `CS Helper`: turn project context plus incoming customer messages into reply drafts, internal notes, and support-ready response text
- `Projects`: inspect local repositories, git status, ports, env hints, and cleanup targets
- `Doc Hub`: browse project docs such as `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `docs/*.md`
- `Meeting Hub`: track teams, meetings, uploaded notes, action items, and GitHub follow-up work
- `File Manager`: review cleanup suggestions for Desktop and Downloads
- `System`: inspect local machine status, processes, runtime info, and app launch actions
- `Info Hub`: read daily refreshed news, trends, package updates, and security checks
- `Signal Writer`: turn selected signals into drafts, trend boards, fact checks, and follow-up research
- `Call to PRD`: turn notes, transcripts, or meeting context into PRDs and working docs

By default, the app starts in a simpler navigation mode and keeps more operational tabs out of the way until you switch to the full view.

## CS Helper

`CS Helper` is for customer communication work, not just generic text generation.

You select a project, bring in the relevant context, paste a customer message or issue summary, and generate:

- customer reply drafts
- internal analysis notes
- project-aware response options
- regenerated variants when you want a different tone or framing

It is useful when you need fast, context-aware support writing without manually reconstructing project background every time.

## Core Strengths

- Local AI workspace built around your own CLI tools
- Project and document visibility across your machine
- Meeting and action tracking tied back to local project context
- PRD and work-doc generation from real project context
- Daily information flow for news, trends, dependency updates, and security checks
- Signal-to-draft writing flow with built-in research support
- A guided UI that makes advanced local workflows more usable for non-developers

## Stack

- Next.js 15
- React 19
- Electron 35
- local `ffmpeg`
- local `whisper` or `whisper-cli`
- local `claude` and/or `codex` CLI
- optional OpenAI API fallback for `CS Helper` and `Call to PRD`

## Quick Start

### macOS

Recommended for most users:

1. Open [Releases](https://github.com/p-changki/dashboard-LAB/releases)
2. Download the latest macOS build asset such as `dashboard-LAB-0.1.16-arm64.dmg` or `dashboard-LAB-0.1.16-arm64-mac.zip`
3. Open the app package and run it

If you are running from the source repository instead:

1. Download this repository with `Code -> Download ZIP`, or clone it
2. Open the extracted folder in Finder
3. Double-click `Run-Dashboard-LAB.command` for the first setup and browser launch
4. Optional but recommended on macOS: double-click `Install-Dashboard-LAB-Launcher.command`
5. After that, open `~/Applications/dashboard-LAB Dev.app` whenever you want to start the local app without typing `pnpm dev`

If you prefer the CLI:

```bash
pnpm setup:mac
pnpm doctor
pnpm launch
```

### Windows / Linux

Windows and Linux desktop targets are currently experimental.

```bash
pnpm install
pnpm doctor
pnpm launch
```

## For Non-Developers

If you just want to try the app on macOS:

1. Open [Releases](https://github.com/p-changki/dashboard-LAB/releases).
2. Download a macOS build asset such as `dashboard-LAB-0.1.16-arm64.dmg`.
3. Open the downloaded app package and launch it.

If you downloaded the source code instead of a release build:

1. Use `Code -> Download ZIP` on GitHub.
2. Unzip the folder.
3. Open the folder and double-click `Run-Dashboard-LAB.command`.
4. Wait while the launcher installs missing tools and opens the app in your browser.
5. If you want a clickable app for future launches, double-click `Install-Dashboard-LAB-Launcher.command`.
6. After that, start the local app from `~/Applications/dashboard-LAB Dev.app`.

Notes:

- The first run can take several minutes.
- Keep the terminal window open while the app is running.
- `Install-Dashboard-LAB-Launcher.command` creates a reusable macOS launcher app so you do not need to type `pnpm dev` every time.
- Do not download `Source code (zip)` or `Source code (tar.gz)` unless you want the raw repository instead of an installable app.
- `Run-Dashboard-LAB.command` is a file inside the downloaded repository folder, not a button on the GitHub page.
- If setup stops early, the terminal window will show the failed step and what to install first.
- Audio transcription tools are optional and can be added later when you actually need voice workflows.

## Requirements

Core:

- Node.js 22+
- `pnpm`
- `claude` CLI or `codex` CLI for the best local generation experience
- optional OpenAI API key for fallback generation

Optional for audio workflows:

- `ffmpeg`
- `whisper` or `whisper-cli`
- `models/ggml-base.bin`

## Desktop Builds

Development:

```bash
pnpm assets:icon
pnpm desktop:dev
```

Local packaged build:

```bash
pnpm assets:icon
pnpm desktop:build
```

Platform distributions:

```bash
pnpm assets:icon
pnpm desktop:dist:mac
pnpm desktop:dist:win
pnpm desktop:dist:linux
```

## Development

```bash
pnpm dev
pnpm lint
pnpm type-check
pnpm build
```

If `pnpm install` reports ignored native build scripts, run:

```bash
pnpm approve-builds
pnpm rebuild electron node-pty
```

## Troubleshooting

- `Homebrew is required`: install Homebrew from <https://brew.sh> and run the launcher again.
- `ffmpeg` missing: only needed for audio conversion. Run `brew install ffmpeg` on macOS if you want voice workflows.
- `whisper` or `whisper-cli` missing: only needed for transcription. Run `brew install whisper-cpp` on macOS if you want voice workflows.
- Packaged desktop app cannot find `ggml-base.bin`: create the desktop model link once so Call → PRD can reuse the local model file.

```bash
mkdir -p "$HOME/Library/Application Support/dashboard-lab/models"
ln -sf "/Users/changkipark/Desktop/dashboard-LAB/models/ggml-base.bin" \
  "$HOME/Library/Application Support/dashboard-lab/models/ggml-base.bin"
```

- Browser did not open automatically: run `pnpm launch` and open the local URL shown in the terminal.
- PRD generation is unavailable: make sure `claude` or `codex` CLI is installed, or save an OpenAI API key during onboarding.

## Project Files

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [LICENSE](LICENSE)

## Release Status

- macOS: best current path for public testing
- Windows: experimental
- Linux: experimental
- zero-config onboarding for every dependency path: not finished

## Privacy

Do not commit customer recordings, transcripts, generated private documents, local state files, or API keys.

## License

MIT
