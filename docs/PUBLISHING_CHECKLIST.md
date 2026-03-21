# dashboard-LAB Publishing Checklist

This project is structurally ready for GitHub publication and desktop packaging across macOS, Windows, and Linux.

## Ready

- standalone repository in `dashboard-LAB`
- Electron desktop shell
- macOS unpacked desktop build
- CI workflow for lint, type-check, web build, and desktop smoke build
- release workflow for tagged multi-platform desktop artifacts
- open-source support docs:
  - `README.md`
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `CODE_OF_CONDUCT.md`

## Remaining Blocker

- None for source publication or tagged desktop release.

## Release Commands

```bash
pnpm assets:icon
pnpm lint
pnpm type-check
pnpm desktop:build
git tag v0.1.5
git push origin v0.1.5
```

## Pre-Publish Notes

- `release/` is a generated artifact directory and should not be committed.
- The packaged desktop baseline disables the embedded terminal server.
- OpenAI API fallback is now supported for `CS Helper` and `Call to PRD` when the key is saved in onboarding.
- macOS code signing and notarization are still optional follow-up work.
- `asar` is currently disabled and can be hardened in a later release pass.
- GitHub Actions workflows are pinned to current major versions to avoid the prior Node 20 runtime deprecation warning.
