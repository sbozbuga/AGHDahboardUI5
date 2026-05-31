## 2025-05-31 - Concurrent API Requests with Promise.all

**Learning:** When making multiple independent asynchronous calls (like fetching logs and fetching client data), awaiting them sequentially artificially increases total execution time by the sum of both latencies.
**Action:** Always identify independent promises and group them using `Promise.all` to execute them concurrently, reducing total execution time to the latency of the slowest request.
