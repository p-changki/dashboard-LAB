# Contributing

Thanks for contributing to `dashboard-LAB`.

## Local Setup

```bash
pnpm install
pnpm lint
pnpm type-check
pnpm build
```

For desktop work:

```bash
node scripts/generate-app-icon.mjs
pnpm rebuild electron node-pty
pnpm desktop:dev
```

## Branch Flow

`dev` is the default branch and where day-to-day work lands. `main` holds
release-ready code and is what release tags are cut from.

```
feature/* --PR--> dev --PR--> main --tag v*--> release
```

- **Open pull requests against `dev`**, not `main`. GitHub defaults to `dev`,
  so this happens automatically unless you change the base.
- `dev` accepts direct pushes; `main` does not — it only takes pull requests,
  and they must pass CI (`verify` plus `desktop-smoke` on all three OSes).
- CI runs on every pull request and on pushes to `dev` and `main`.

## Releasing

Releases are automated: pushing a `v*` tag triggers `.github/workflows/release.yml`,
which builds the macOS, Windows, and Linux desktop artifacts and publishes them
to a GitHub Release with generated notes.

Because `main` is protected, the version bump goes through a pull request:

1. Bump `version` in `package.json` on `dev` (or a branch off it).
2. Open and merge a `dev` -> `main` pull request.
3. Tag the merge commit on `main` and push the tag:

```bash
git checkout main && git pull
git tag vX.Y.Z && git push origin vX.Y.Z
```

4. Watch the release workflow; the Release appears only after all three
   platform builds succeed.

If a build fails, do not move or force-push the tag — cut a new patch version
instead.

## Pull Request Guidelines

- Target `dev` unless you are cutting a release.
- Keep changes scoped and reversible.
- Update docs when setup, packaging, or user-facing behavior changes.
- Run `pnpm lint` and `pnpm type-check` before opening a PR.
- If you touch desktop packaging, also run `pnpm desktop:build` on macOS.

## What To Avoid

- Do not commit recordings, transcripts, generated customer docs, or local state files.
- Do not hardcode personal filesystem paths into runtime code.
- Do not add destructive file operations without explicit safety checks.
