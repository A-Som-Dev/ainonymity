# Changelog

All notable changes to AInonymous are documented here. The format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is [SemVer](https://semver.org/).

## [1.1.2] - 2026-04-16

Documentation-only patch. No runtime changes. Fixes version-staleness across docs after the v1.1.x rebrand series.

### Changed
- `CHANGELOG.md` now covers the 1.0.x and 1.1.x release trail.
- `README.md`, `OPERATIONS.md`, `SECURITY.md`, `THREAT_MODEL.md` reference the current version where previously pinned to `1.0.0`.
- `legal/DPA-template.md` TOM description acknowledges the opt-in `session.persist: true` mode (SQLite-backed AES-256-GCM store), instead of claiming that no persistence exists.
- Internal `v1.1 candidates` labels for deferred items (Unicode confusables, HMAC audit chain, per-regex timeout, pseudonym-replay guard, `ainonymous key rotate`, ISO 13616 IBAN regex) are now `v1.2 candidates`.

## [1.1.1] - 2026-04-16

Branding-consistency patch. No behavior change.

### Changed
- Renamed internal identifiers that the earlier rebrand pass missed: `AInonymityConfig` TypeScript type is now `AInonymousConfig`, Prometheus metric names are now `ainonymous_*` (previously `ainonymity_*`), `src/index.ts` re-exports are aligned.

## [1.1.0] - 2026-04-16

**Breaking: renamed from `ainonymity` to `ainonymous`.** All user-facing identifiers changed: npm package name, CLI binary, config filename, environment variables, token / session DB / audit paths, HTTP realm, brand string. Earlier `ainonymity@*` publishes have been unpublished; the npm name is permanently retired.

### Changed
- npm package: `ainonymity` → `ainonymous`.
- CLI binary: `ainonymity` → `ainonymous`.
- Config filename: `.ainonymity.yml` → `.ainonymous.yml`.
- Environment variables: `AINONYMITY_MGMT_TOKEN` → `AINONYMOUS_MGMT_TOKEN`, `AINONYMITY_SESSION_KEY` → `AINONYMOUS_SESSION_KEY`, `AINONYMITY_HOST` → `AINONYMOUS_HOST`, `AINONYMITY_UPSTREAM_*` → `AINONYMOUS_UPSTREAM_*`.
- Default audit directory: `./ainonymity-audit/` → `./ainonymous-audit/`.
- Default session DB: `./ainonymity-session.db` → `./ainonymous-session.db`.
- Token paths: `$TMPDIR/ainonymity-<port>.token` → `$TMPDIR/ainonymous-<port>.token` (POSIX); `%USERPROFILE%\.ainonymity\` → `%USERPROFILE%\.ainonymous\` (Windows).
- HTTP bearer realm: `ainonymity` → `ainonymous`.
- Brand string `AInonymity` → `AInonymous`.
- Demo data in `examples/before-after/` and `tests/integration/proxy-e2e.test.ts` is now fictional (`Acme Corp`, `CustomerDB`, `Kay Example`) instead of identifying a specific third party.

### Migration
- Rename `.ainonymity.yml` to `.ainonymous.yml` (same schema, no content change required).
- Rename any `AINONYMITY_*` environment variables in your deployment manifests to `AINONYMOUS_*`.
- Rename `@ainonymity:redact` source-code annotations to `@ainonymous:redact`.
- Prometheus scrape configs consuming `ainonymity_*` counters must switch to `ainonymous_*`.
- The `ainonymity-audit/` directory on disk is not read by the new binary; move or archive it. New audit files land in `ainonymous-audit/`.
- Pseudonyms persisted in an old `ainonymity-session.db` are not imported automatically; start fresh with `ainonymous-session.db`.

## [1.0.0] - 2026-04-16

Initial public release.

### Added
- Three-layer anonymization pipeline (secrets, identity, code semantics).
- Local HTTP proxy with SSE-aware rehydration for Anthropic and OpenAI API formats.
- AST-based identifier extraction via Tree-sitter WASM for TypeScript, JavaScript, Java, Kotlin, Python, PHP, Go, Rust, and C#.
- OpenRedaction integration with selectable compliance presets (`gdpr`, `hipaa`, `pci-dss`, `ccpa`, `finance`, `healthcare`).
- AES-256-GCM encrypted session map with key rotation, lazy decrypt cache.
- Optional session map persistence via built-in `node:sqlite` (requires Node.js 22.5+).
- Bearer-token authentication on management endpoints (`/metrics`, `/dashboard`, `/events`, dashboard assets).
- Audit log as SHA-256 hash chain with SIEM-friendly JSONL output.
- Live dashboard with strict CSP (no `'unsafe-inline'`), SSE event stream.
- CLI commands: `start`, `stop`, `status`, `init`, `scan`, `audit`, `glossary`, `hooks`, plus wrapper mode (`ainonymous -- <tool>`).
- Unicode normalization (NFKC + zero-width-character strip) to defeat ZWJ and fullwidth bypass attacks on pattern detection.
- HTTP header anonymization with passthrough list for auth and provider-specific headers.
- Signed releases via Sigstore keyless signing and npm provenance.

### Known limitations
- Unicode confusables (e.g. Cyrillic `а` vs Latin `a`) are not unified. Tracked as v1.2 item.
- Audit log chain is SHA-256, not HMAC. Tamper-evident against external readers; an insider with write access to the audit directory can forge the tail.
- Session map is unbounded (no LRU / TTL).
- Pseudonym broadcast on `/events` reveals live mapping names to any subscriber authenticated with the mgmt token.
- User-supplied `secrets.patterns` regexes have no complexity gate and can backtrack catastrophically.

See `THREAT_MODEL.md` for the full residual-risk analysis.
