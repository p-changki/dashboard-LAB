# Runtime Data

This directory is for local runtime data only in source-checkout mode.

- `state/` stores app state such as onboarding settings and local history.
- `prd/` stores generated output documents.

When the Electron app is packaged, runtime data moves to the OS user data directory instead of the app bundle.

Do not commit customer recordings, transcripts, or generated client documents.
