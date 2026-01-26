## 2026-01-26 - Parallelize Independent Async Operations
**Learning:** In `Dashboard.controller.ts`, sequential `await` calls for independent API requests (`getStats` and `getSlowestQueries`) unnecessarily blocked the UI update. Parallelizing them with `Promise.all` reduces total latency to the maximum of the two requests rather than the sum.
**Action:** Always check for independent async operations in `onInit` or refresh cycles and use `Promise.all` to execute them concurrently.
