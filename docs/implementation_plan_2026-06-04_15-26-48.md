# Implementation Plan - Fix UI5 Bootstrap, Resource Paths, and Tests

**Status:** APPROVED
**Date/Time:** 2026-06-04 15:26:48 (GMT+2) *(Updated 16:35)*

This plan addresses the errors identified in the console logs and test results. I have carefully reviewed the provided error log and mapped each issue to its root cause.

## Error Log Analysis

1. **`sw.js` Content Security Policy (CSP) Errors:**
   - **Log:** `sw.js:41 Connecting to 'https://fonts.googleapis.com/...' violates the following Content Security Policy directive: "connect-src 'self' ws: wss: https://cdn.jsdelivr.net https://cdn.socket.io".`
   - **Analysis:** This error is **external** to our `AGHDahboardUI5` repository. The CSP directive shown belongs to the AdGuard Home server's main web interface. Its own service worker (`sw.js`) is intercepting font requests and being blocked by its own server's CSP. 
   - **Action:** No code changes are required or possible in this repository for this specific error.

2. **JSON Parsing Errors (Resource Roots):**
   - **Log:** `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
   - **Analysis:** Originally occurred because of the hash fragment `#v=1.0.1` in the resource roots configuration in `webapp/index.html`. When UI5 built the URL (e.g., `./#v=1.0.1/manifest.json`), the browser interpreted everything after `#` as a fragment, requesting the root HTML page instead.
   - **Action:** Removed the hash fragment from the resource roots.

3. **UI5 Library Preload Errors:**
   - **Log:** `Refused to execute script from '.../sap/ui/layout/library-preload.js' because its MIME type ('text/html') is not executable...`
   - **Analysis:** In a self-contained production build, all framework library modules are bundled inside `sap-ui-custom.js`. However, UI5 still attempts to load library preload files (`sap/ui/layout/library-preload.js`, etc.) for declared dependencies. Because these do not exist, the static server returns the fallback `index.html` (MIME `text/html`), causing browser MIME check blocks.
   - **Action:** Suppress library preload attempts in the production build bootstrap by appending `data-sap-ui-preload=""` to the script tag in `dist/index.html`.

4. **OPA Integration Test Failures:**
   - **Analysis:** Tests failed because the page title was not translating, caused by the i18n model configuration using `bundleUrl` instead of `bundleName`. `bundleUrl` resolved paths relative to the test runner's page, resulting in 404s.
   - **Action:** Reverted to using `bundleName`.

5. **Version Info JSON Parsing Error:**
   - **Log:** `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` from `VersionInfo-dbg.js`
   - **Analysis:** The theme loader requests `resources/sap-ui-version.json` at startup. In newer versions of the UI5 CLI, the `generateVersionInfo` build task is disabled by default, meaning this file was missing from `dist/resources/`, resulting in the server serving fallback HTML.
   - **Action:** Explicitly enable the `generateVersionInfo` task during the production build.

---

## Proposed Changes

### [MODIFY] [package.json](file:///home/sb/gitRepo/AGHDahboardUI5/package.json)
Update the `build:opt` script. We will:
1. Append the `--include-task generateVersionInfo` flag to the build command to generate `sap-ui-version.json`.
2. Append a timestamp query parameter to the `sap-ui-custom.js` reference in `dist/index.html` for cache busting.
3. Append `data-sap-ui-preload=""` to the bootstrap `<script>` tag in `dist/index.html` to suppress unnecessary preload requests.

**Updated build:opt script:**
```json
"build:opt": "ui5 build self-contained --clean-dest --all --include-task generateVersionInfo && node -e \"const fs=require('fs');const p='dist/index.html';let c=fs.readFileSync(p,'utf8');c=c.replace('resources/sap-ui-custom.js','resources/sap-ui-custom.js?v=' + Date.now());c=c.replace('data-sap-ui-async=\\\"true\\\"','data-sap-ui-async=\\\"true\\\" data-sap-ui-preload=\\\"\\\"');fs.writeFileSync(p,c);console.log('Added cache buster and preload configuration to index.html')\""
```

### [MODIFY] [index.html](file:///home/sb/gitRepo/AGHDahboardUI5/webapp/index.html)
Ensure the `data-sap-ui-resource-roots` attribute does not contain any invalid hash fragments:
`data-sap-ui-resource-roots='{ "ui5.aghd": "./" }'`.

### [MODIFY] [manifest.json](file:///home/sb/gitRepo/AGHDahboardUI5/webapp/manifest.json)
In the `models.i18n.settings` block, use `"bundleName": "ui5.aghd.i18n.i18n"`.

---

## Verification Plan

### Automated Tests
- Run `npm run health` to ensure syntax, formatting, and linting pass.
- Run `npm run test` to verify that all unit and OPA integration tests pass.

### Manual Verification
- Execute `npm run build:opt` and verify that `dist/resources/sap-ui-version.json` exists.
- Inspect `dist/index.html` to confirm the bootstrap script has `data-sap-ui-preload=""` and the `sap-ui-custom.js?v=<timestamp>` query string.
