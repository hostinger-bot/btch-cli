# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.8] - 2026-08-17

### Changed
- Sync example version references across install.sh, README, and release workflow

## [3.0.7] - 2026-08-17

### Fixed
- `/apikey` now actually opens the API key modal when picked from the slash menu (missing case in `handleSlashMenuSelect`)

## [3.0.6] - 2026-08-17

### Added
- New `/apikey` command in the TUI to change the API key without leaving the app

### Fixed
- **Termux install failure**: dropped the unused `@coinbase/agentkit` dependency,
  which pulled in native `bigint-buffer` / `bufferutil` node-gyp builds that
  fail on Termux (missing Android NDK). `@x402/fetch`, `@x402/evm`, and `viem`
  are now direct dependencies — install is now pure-JS with no native builds.

## [3.0.5] - 2026-08-17

### Added
- **Native Android (Termux) build**: release now ships `btch-android-arm64` (bionic-linked, Bun 1.3.14+ `bun-android-arm64` target) that runs directly on Termux with the full interactive TUI
- `install.sh` detects Termux automatically and downloads the Android build (plus symlinks to `$PREFIX/bin`)

### Fixed
- `install.sh` on Termux previously downloaded the glibc `linux-arm64` binary, which cannot execute on Termux (bionic libc) — `cannot execute: required file not found`

## [3.0.4] - 2026-08-17

### Added
- ARM64 Linux support: release now ships `btch-linux-arm64` (cross-compiled) for Raspberry Pi / ARM Linux
- Termux/Android support: `npm install -g btch-cli` auto-installs OpenTUI's linux-arm64 native package via postinstall (npm skips it on Android because Node reports platform `android` while Bun reports `linux`)

### Changed
- Release tag prefix renamed from `btch-dev@` to `btch-cli@` so tags match the npm package name
- Pinned `@opentui/core` / `@opentui/react` to `0.1.88` for reproducible builds

## [3.0.3] - 2026-08-17

### Changed
- Default model is now `auto` (endpoint-managed automatic routing) instead of a hardcoded model

## [3.0.2] - 2026-08-17

### Removed
- README: remove the Releasing section

## [3.0.1] - 2026-08-17

### Changed
- README: document install via npm/pnpm/yarn and a proper production release process

## [3.0.0] - 2026-08-17

### Changed
- Version bumped to 3.0.0 to avoid registry conflicts
- Auto npm publish on every GitHub release (version derived from release tag)
- Repository, homepage, and bugs URLs added to package.json

## [1.0.3] - 2026-08-17

### Fixed
- API key prompt now shows btch branding
- Installer creates a `/usr/local/bin/btch` symlink so `btch` works immediately after install (falls back to a PATH hint when not possible)
- Uninstall removes the global symlink so nothing is left dangling

### Changed
- README now documents full install and uninstall instructions

## [1.0.2] - 2026-08-17

### Added
- Installer now auto-selects the correct binary: modern CPUs get the faster build, pre-AVX2 CPUs (e.g. older VMs) automatically get the `-baseline` build
- Release now ships both linux variants (`btch-linux-x64` and `btch-linux-x64-baseline`)

### Changed
- Version is now sourced from `package.json` everywhere, so the binary, changelog, and release tags always stay in sync

## [1.0.0] - 2026-08-17

### Added
- Rebranded as **btch-cli** — an OpenAI-compatible terminal AI coding agent (default endpoint `https://ai.tioo.eu.org/v1`)
- Model list auto-fetched from the endpoint's `/v1/models` on startup and on every `/models` open
- GitHub release workflow publishing binaries for linux-x64, darwin-arm64, and windows-x64 with checksums

### Changed
- Switched provider to any OpenAI-compatible endpoint via `@ai-sdk/openai-compatible`
- Renamed env vars (`BTCH_*`), data dirs (`~/.btch`, `.btch/`), and binaries to btch

### Removed
- Proprietary-only features: X/web search, image & video generation, Batch API, speech-to-text
