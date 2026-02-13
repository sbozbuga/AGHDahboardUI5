## 2026-02-07 - AdGuardService Top-K Optimization
**Learning:** For small fixed-size top-K lists (e.g., top 10 domains), maintaining a sorted array via linear insertion (O(N*k)) is significantly faster than sorting the array on every insertion (O(N * k log k)) or collecting all and sorting (O(N log N)). In high-frequency loops, avoiding function call overhead (like `sort` callbacks) yields measurable gains.
**Action:** When implementing "Top N" features, prefer manual insertion into a fixed-size array over `push` + `sort`.

## 2026-02-13 - Redundant Data Processing & Mock Mismatch
**Learning:** Always verify the actual return type of a service before "optimizing" data processing in a consumer. In this case, `Logs.controller.ts` was re-parsing `Date` and `number` objects that `AdGuardService` had already processed, wasting O(N) cycles. The existing unit test masked this by mocking the service to return raw strings, forcing the controller to handle them.
**Action:** When optimizing data handling, audit the data source first. Ensure mocks strictly match the service contract (e.g., using `Date` objects if the service returns them) to avoid enforcing redundant logic.
