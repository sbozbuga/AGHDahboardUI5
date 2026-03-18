## 2024-05-24 - Prevent Information Leakage in Browser Console
**Vulnerability:** Raw error objects were being logged directly to the browser console (e.g., `console.error(error)`).
**Learning:** This exposes internal structure and stack traces, violating the "Fail securely" principle and potentially leaking sensitive data.
**Prevention:** Always log the `(error as Error).message || 'Unknown error'` property instead of the raw `error` object when writing to the console.
