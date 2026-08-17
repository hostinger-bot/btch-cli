# AGENTS.md

## Cursor Cloud specific instructions

### Overview

btch-cli is a single-package TypeScript CLI tool — no databases, Docker, or background services. See `README.md` for full documentation and usage.

### Quick reference


| Action        | Command                                                               |
| ------------- | --------------------------------------------------------------------- |
| Install deps  | `bun install` (installs Husky; pre-commit runs Biome on staged files) |
| Typecheck     | `bun run typecheck`                                                   |
| Build         | `bun run build`                                                       |
| Run built CLI | `node dist/index.js`                                                  |
| Headless mode | `node dist/index.js --prompt "..." --max-tool-rounds N`               |
| CLI help      | `node dist/index.js --help`                                           |


### Version bumps & releases

When bumping the version (e.g. `3.0.10` → `3.0.11`), **every place that references the old version must be updated to the new one** so all artifacts stay in sync. Search the repo for the old version string (`grep -rn "<old-version>" --include="*.json" --include="*.md" --include="*.sh" --include="*.yml" .`) and update all matches except historical entries in `CHANGELOG.md`:

- `package.json` — the source of truth (`version` field)
- `install.sh` — the `--version` example in help text
- `README.md` — the `--version` example in install instructions
- `.github/workflows/release.yml` — the example tag/version in comments
- `CHANGELOG.md` — add a new entry at the top with the new version

Then verify consistency (`grep -rn "<new-version>" .` shows no leftover old version outside CHANGELOG history), run `bun run typecheck` + tests, commit, push to `main`, and create a GitHub release with tag `btch-cli@<new-version>` — the CI workflow builds all platform binaries and publishes to npm automatically. Use `btch-cli@` (not `btch-dev@`) as the release tag prefix.

### Known issues

- **ESLint config is broken**: The repo has `.eslintrc.js` (legacy format) but uses ESLint 9 (`^9.31.0`) + `@typescript-eslint` v8, which require flat config (`eslint.config.js`). Additionally, `.eslintrc.js` uses `module.exports` (CJS) but `package.json` has `"type": "module"` (ESM). Running `bun run lint` will fail. Use `bun run typecheck` as the primary code quality check (this is also what CI enforces).

### Environment

- **Bun** must be installed (not pre-installed on Cloud VMs). The update script handles this.
- `BTCH_API_KEY` environment variable is required for API calls. Set it as a secret.
