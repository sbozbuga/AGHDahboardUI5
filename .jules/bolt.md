## 2026-01-26 - Parallelize Independent Async Operations
**Learning:** In `Dashboard.controller.ts`, sequential `await` calls for independent API requests (`getStats` and `getSlowestQueries`) unnecessarily blocked the UI update. Parallelizing them with `Promise.all` reduces total latency to the maximum of the two requests rather than the sum.
**Action:** Always check for independent async operations in `onInit` or refresh cycles and use `Promise.all` to execute them concurrently.

## 2026-01-27 - Optimize Polling Frequency
**Learning:** In `Dashboard.controller.ts`, the default polling frequency of 5 seconds for `onRefreshStats` was excessive for a dashboard that doesn't change rapidly, causing unnecessary network traffic and server load.
**Action:** Increased `REFRESH_INTERVAL` to 15 seconds. This reduces API calls by 66% while maintaining acceptable data freshness. Configuration of polling intervals should balance freshness with performance impact.

## 2026-01-27 - Efficient Sorting with Schwartzian Transform
**Learning:** In `AdGuardService.ts`, sorting log entries involved repeatedly parsing string timestamps inside the comparator. This $O(N \log N)$ parsing overhead is inefficient. Using the "map-sort-map" pattern (Schwartzian transform) creates an intermediate array with pre-parsed values, reducing parsing to $O(N)$ and significantly improving performance.
**Action:** When sorting arrays based on derived values (especially if derivation is expensive, like parsing or DOM access), pre-calculate the values before sorting.

## 2026-01-28 - Slice Before Transform
**Learning:** In `AdGuardService.ts`, the `transformList` method processed the entire array of domains (mapping, type checking, searching keys) before `getStats` sliced the result to the top 10. This wasted CPU cycles on items that were immediately discarded.
**Action:** Apply `slice` or `limit` constraints as early as possible in the data processing pipeline, ideally before expensive mapping or transformation logic.

## 2026-01-29 - Conditional Data Enrichment
**Learning:** In `AdGuardService.ts`, `getQueryLog` was performing O(N) string analysis to set a `blocked` property on every record, even when the caller (e.g., `getSlowestQueries`) didn't use that property. This wasted CPU cycles during frequent polling.
**Action:** Add optional flags to data fetching methods to skip expensive post-processing or enrichment steps when the caller only needs raw or partial data.

## 2026-02-01 - Visibility-Aware Polling
**Learning:** In `Dashboard.controller.ts`, the dashboard continued polling every 15 seconds even when the tab was in the background, wasting network bandwidth and CPU. The `visibilitychange` event can be used to pause/resume polling.
**Action:** Always implement a `visibilitychange` listener for auto-refreshing components to pause activity when `document.hidden` is true.
