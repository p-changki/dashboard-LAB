# dashboard-LAB v0.1.5 Checklist

## Release Scope

- stabilize the first public multi-platform desktop release after `v0.1.4`
- remove GitHub Actions runtime deprecation warnings
- tighten first-run onboarding for non-developers
- verify the app can complete one end-to-end workflow on each supported desktop OS

## Pre-Release Checks

- run `pnpm lint`
- run `pnpm type-check`
- run `pnpm build`
- run `pnpm desktop:build`
- confirm `.github/workflows/ci.yml` and `.github/workflows/release.yml` use Node 24-compatible action majors
- confirm onboarding can save:
  - project root
  - Obsidian vault path
  - PRD output directory
  - CS context directory
  - optional OpenAI API key

## Blockers

- any failed smoke test on macOS, Windows, or Linux installer builds
- onboarding cannot recover from missing `ffmpeg` or Whisper requirements
- `CS Helper` cannot fall back to OpenAI when local CLI tools are missing
- `Call to PRD` cannot generate from text input with OpenAI API mode enabled

## Smoke Tests

### macOS

- install from `dmg`
- launch app and finish onboarding
- install missing audio tooling from onboarding if prompted
- open `Projects` and verify the selected project root is visible
- open `Doc Hub` and verify project docs are visible
- generate one `CS Helper` response
- generate one text-based `Call to PRD` document
- relaunch and verify settings persist

### Windows

- install from `exe`
- launch app and finish onboarding
- verify missing tools are surfaced with clear guidance
- generate one `CS Helper` response with OpenAI fallback
- generate one text-based `Call to PRD` document
- relaunch and verify settings persist

### Linux

- launch from `AppImage`
- finish onboarding
- verify the selected project root drives `Projects` and `Doc Hub`
- generate one `CS Helper` response with OpenAI fallback
- relaunch and verify settings persist

## Rollback Plan

- revert the release candidate commit on `main`
- delete the `v0.1.5` tag if the release workflow publishes broken assets
- remove the GitHub Release entry if packaging succeeds but smoke tests fail
- keep `v0.1.4` as the last known-good public rollback target

## Follow-Up After Deploy

- add macOS code signing and notarization
- evaluate Windows code signing for SmartScreen trust
- decide whether to re-enable the embedded terminal in packaged builds
- harden packaging with `asar` once installer smoke tests are stable
