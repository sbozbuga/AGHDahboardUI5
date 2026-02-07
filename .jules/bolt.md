## 2026-02-07 - AdGuardService Top-K Optimization
**Learning:** For small fixed-size top-K lists (e.g., top 10 domains), maintaining a sorted array via linear insertion (O(N*k)) is significantly faster than sorting the array on every insertion (O(N * k log k)) or collecting all and sorting (O(N log N)). In high-frequency loops, avoiding function call overhead (like `sort` callbacks) yields measurable gains.
**Action:** When implementing "Top N" features, prefer manual insertion into a fixed-size array over `push` + `sort`.
