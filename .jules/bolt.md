## 2026-04-15 - Refactor Inline RegExp to Static Property
**Learning:** In high-frequency loops (such as formatting arrays of IP strings in `ClientService`), inline regular expressions (e.g. `id.replace(/[[\]]/g, "")`) are recompiled on every execution, causing unnecessary CPU overhead.
**Action:** Extract literal regular expressions used inside loops or high-frequency methods to `private static readonly` class properties to compile them once, caching the RegExp instance and yielding measurable performance improvements.
