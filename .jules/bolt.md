## 2026-01-26 - Parallelize Independent Async Operations
**Learning:** In `Dashboard.controller.ts`, sequential `await` calls for independent API requests (`getStats` and `getSlowestQueries`) unnecessarily blocked the UI update. Parallelizing them with `Promise.all` reduces total latency to the maximum of the two requests rather than the sum.
**Action:** Always check for independent async operations in `onInit` or refresh cycles and use `Promise.all` to execute them concurrently.

## 2026-01-27 - Optimize Polling Frequency
**Learning:** In `Dashboard.controller.ts`, the default polling frequency of 5 seconds for `onRefreshStats` was excessive for a dashboard that doesn't change rapidly, causing unnecessary network traffic and server load.
**Action:** Increased `REFRESH_INTERVAL` to 15 seconds. This reduces API calls by 66% while maintaining acceptable data freshness. Configuration of polling intervals should balance freshness with performance impact.
## 2026-01-27 - Efficient Sorting with Schwartzian Transform
**Learning:** In `AdGuardService.ts`, sorting log entries involved repeatedly parsing string timestamps inside the comparator. This $O(N \log N)$ parsing overhead is inefficient. Using the "map-sort-map" pattern (Schwartzian transform) creates an intermediate array with pre-parsed values, reducing parsing to $O(N)$ and significantly improving performance.
**Action:** When sorting arrays based on derived values (especially if derivation is expensive, like parsing or DOM access), pre-calculate the values before sorting.
