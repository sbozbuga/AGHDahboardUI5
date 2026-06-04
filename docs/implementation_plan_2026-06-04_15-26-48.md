# Implementation Plan - Fix UI5 Bootstrap, Resource Paths, and Tests

**Status:** APPROVED
**Date/Time:** 2026-06-04 15:26:48 (GMT+2)

This plan addresses the errors identified in the console logs and test results. I have carefully reviewed the provided error log and mapped each issue to its root cause.

## Error Log Analysis

1. **`sw.js` Content Security Policy (CSP) Errors:**
   - **Log:** `sw.js:41 Connecting to 'https://fonts.googleapis.com/...' violates the following Content Security Policy directive: "connect-src 'self' ws: wss: https://cdn.jsdelivr.net https://cdn.socket.io".`
   - **Analysis:** This error is **external** to our `AGHDahboardUI5` repository. The CSP directive shown belongs to the AdGuard Home server's main web interface. Its own service worker (`sw.js`) is intercepting font requests and being blocked by its own server's CSP. 
   - **Action:** No code changes are required or possible in this repository for this specific error.

2. **JSON Parsing Errors:**
   - **Log:** `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
   - **Analysis:** This occurs because of the hash fragment `#v=1.0.1` in the resource roots configuration in `webapp/index.html`. When UI5 builds the URL (e.g., `./#v=1.0.1/manifest.json`), the browser interprets everything after `#` as a fragment, effectively requesting `./` (the root HTML page).
   - **Action:** Remove the hash fragment from the resource roots.

3. **UI5 Library Preload Errors:**
   - **Log:** `Refused to execute script from '.../sap/ui/layout/library-preload.js' because its MIME type ('text/html') is not executable...`
   - **Analysis:** The application is requesting individual library preloads (`sap.ui.layout`, `sap.m`) which are returning 404 HTML pages. This happens because a post-build script in `package.json` manually reverts the bootstrap file in `dist/index.html` back to `sap-ui-core.js`. This forces the app to look for individual library files that don't exist in a self-contained build.
   - **Action:** Fix the post-build script in `package.json` to retain `sap-ui-custom.js` and instead implement proper cache-busting.

4. **OPA Integration Test Failures (Discovered during analysis):**
   - **Analysis:** Tests are failing because the page title is not translating. This is caused by a recent commit changing the i18n model configuration in `manifest.json` from `bundleName` to `bundleUrl: "i18n/i18n.properties"`. `bundleUrl` resolves relative to the test runner's page, resulting in a 404.
   - **Action:** Revert to using `bundleName`.

---

## Proposed Changes

### [MODIFY] [package.json](file:///home/sb/gitRepo/AGHDahboardUI5/package.json)
Update the `build:opt` script. Instead of replacing `sap-ui-custom.js` with `sap-ui-core.js` (which breaks the app), we will implement an **automated cache-busting measure**. The script will append a timestamp query parameter to the `sap-ui-custom.js` reference in `dist/index.html`. Because `sap-ui-custom.js` contains almost the entire application in a self-contained build, cache-busting this single file is highly effective and works perfectly with AdGuard Home's static server.
**New script:**
`"build:opt": "ui5 build self-contained --clean-dest --all && node -e \"const fs=require('fs');const p='dist/index.html';let c=fs.readFileSync(p,'utf8');c=c.replace('resources/sap-ui-custom.js','resources/sap-ui-custom.js?v=' + Date.now());fs.writeFileSync(p,c);console.log('Added cache buster to sap-ui-custom.js')\""`

### [MODIFY] [index.html](file:///home/sb/gitRepo/AGHDahboardUI5/webapp/index.html)
Update the `data-sap-ui-resource-roots` attribute to remove the invalid hash:
Change `data-sap-ui-resource-roots='{ "ui5.aghd": "./#v=1.0.1" }'` 
to `data-sap-ui-resource-roots='{ "ui5.aghd": "./" }'`.

### [MODIFY] [manifest.json](file:///home/sb/gitRepo/AGHDahboardUI5/webapp/manifest.json)
In the `models.i18n.settings` block, revert `bundleUrl: "i18n/i18n.properties"` back to `"bundleName": "ui5.aghd.i18n.i18n"`.

---

## Verification Plan

### Automated Tests
- Run `npm run health` to ensure no linting or type errors are introduced.
- Run `npm run test` to verify that OPA integration tests pass.

### Manual Verification
- Execute `npm run build:opt` and inspect `dist/index.html` to confirm the bootstrap script is `resources/sap-ui-custom.js?v=<timestamp>`.
