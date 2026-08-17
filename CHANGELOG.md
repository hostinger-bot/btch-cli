# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
