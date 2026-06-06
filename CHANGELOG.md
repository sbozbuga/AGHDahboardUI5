# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2026-06-06

### Added
- Auto-detected clients now properly map `mac` addresses in addition to IPs, improving client recognition across the dashboard.

### Changed
- **Optimization:** Improved the query log calculation loop (`StatsService`) by adding an early break when iterating over chronological logs, boosting performance when scanning deep historical data.
- **Cleanup:** Completely removed the local "Custom Clients" settings feature. Client name resolution now relies 100% on the AdGuard Home backend, simplifying the codebase and preventing conflict bugs.
- **Cleanup:** Removed obsolete benchmark and test scripts (`benchmark.ts`, `test-format-date.js`).

### Fixed
- **UI Bug:** Fixed a critical truncation issue where large query counts (e.g., `20,000`) were incorrectly sliced to 4 characters (`2000`) in Dashboard tiles. Increased `truncateValueTo` properties to `8` across all `NumericContent` tiles.
- **Manifest Validation:** Fixed `manifest.json` Fiori schema errors by adding the required `registrationIds` and `archeType` properties and removing unused `@google` path mapping.
