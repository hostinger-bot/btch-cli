# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
