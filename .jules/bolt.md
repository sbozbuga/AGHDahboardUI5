## 2026-02-07 - AdGuardService Top-K Optimization
**Learning:** For small fixed-size top-K lists (e.g., top 10 domains), maintaining a sorted array via linear insertion (O(N*k)) is significantly faster than sorting the array on every insertion (O(N * k log k)) or collecting all and sorting (O(N log N)). In high-frequency loops, avoiding function call overhead (like `sort` callbacks) yields measurable gains.
**Action:** When implementing "Top N" features, prefer manual insertion into a fixed-size array over `push` + `sort`.

## 2026-02-13 - Redundant Data Processing & Mock Mismatch
**Learning:** Always verify the actual return type of a service before "optimizing" data processing in a consumer. In this case, `Logs.controller.ts` was re-parsing `Date` and `number` objects that `AdGuardService` had already processed, wasting O(N) cycles. The existing unit test masked this by mocking the service to return raw strings, forcing the controller to handle them.
**Action:** When optimizing data handling, audit the data source first. Ensure mocks strictly match the service contract (e.g., using `Date` objects if the service returns them) to avoid enforcing redundant logic.

## 2026-02-20 - Numeric Parsing Optimization
**Learning:** Checking types (`typeof x === 'number'`) before parsing is significantly faster than unconditionally calling `parseFloat()`, especially when processing large datasets where inputs are often already numbers. Additionally, using `Math.round(x * 100) / 100` avoids the overhead of `toFixed()` string allocation and parsing.
**Action:** In data processing services, prioritize type checks and mathematical operations over string-based parsing for numeric transformations.

## 2026-02-21 - Top-K Early Exit Optimization
**Learning:** Adding an early exit check (`if (item <= smallest_top_k) continue`) to a Top-K manual insertion loop (O(N*K)) drastically reduces comparisons (~90% reduction for sorted or random data), effectively making the best-case complexity O(N).
**Action:** Always implement early exit checks in manual Top-K loops, especially for large datasets.

## 2026-03-05 - Array Operations vs String Manipulation
**Learning:** For parsing or masking simple structured strings (like IPv6 addresses), using `substring` combined with `indexOf` (e.g., manually counting delimiters in a loop) or `lastIndexOf` is measurably faster and more memory-efficient than `.split().slice().join()`. The array-based approach allocates new arrays and creates GC overhead that is easily avoided for simple parsing logic.
**Action:** When repeatedly masking or parsing specific parts of delimited strings, use `indexOf` or `lastIndexOf` and `substring` rather than splitting into arrays.

## 2026-03-05 - False Micro-Optimizations (Ternary Short-Circuiting)
**Learning:** JavaScript ternary operators (e.g., `condition ? a : b`) already short-circuit automatically. Swapping the order of conditions (e.g., checking `typeof x === 'number'` instead of `typeof x === 'string'`) provides no runtime performance benefit for mixed-type datasets, as the execution branches identically.
**Action:** Do not "optimize" ternary operator condition ordering based purely on expected data types; focus on reducing actual functional overhead like function calls or memory allocation.

## 2026-03-09 - String Prefix Checking in Hot Loops
**Learning:** In tight parsing loops iterating over thousands of items, extracting object properties to local variables and using strict equality (`===`) combined with `.indexOf("...") === 0` is measurably faster (~25-30%) than using the modern `.startsWith()` method due to reduced V8 function invocation overhead. Checking the most likely or fastest path (strict equality) first also improves short-circuiting.
**Action:** When evaluating string prefixes on large arrays in high-frequency paths, assign properties to local variables and prioritize `===` followed by `.indexOf("...") === 0` over `.startsWith()`.

## 2026-03-15 - Array Mapping vs Static Regex for Structured Strings
**Learning:** For checking structured strings like IP addresses against specific patterns (e.g., private IP ranges), using a pre-compiled, static Regular Expression is significantly faster and more memory-efficient than splitting the string into arrays and mapping over them (e.g., `.split('.').map(Number)`). The array-based approach incurs heavy overhead from intermediate array allocations and multiple callback invocations.
**Action:** When validating structured strings or checking specific segments (like IP octets), avoid `.split().map()` chains and instead use a well-crafted, static regular expression.

## 2026-03-15 - Security Implications of Regex for IP Validation
**Learning:** While static regular expressions can be faster than array splitting and mapping for checking structured strings like IP addresses, they can introduce severe security vulnerabilities (like SSRF bypasses) when used for validation. The original `.map(Number)` approach correctly parsed hexadecimal obfuscated IPs (e.g., `0x0a.0.0.1` becomes `10.0.0.1` because `Number("0x0a") === 10`). A standard regex only checks for base-10 representations, allowing hex-encoded private IPs to bypass the check.
**Action:** Do not use string-matching regexes for security-critical validation of network addresses where standard parsing functions (like `Number()` or native URL parsers) provide robust handling of obfuscation techniques. Revert this optimization as it sacrifices correctness and security for a false micro-optimization.

## 2026-03-24 - False Micro-Optimization (Manual Array Merging)
**Learning:** In V8/Node.js environments, manually creating a pre-allocated array and using `for` loops to copy elements from two existing arrays is surprisingly slower (~35%) than using native `Array.prototype.concat()`. While manual pre-allocation avoids `push()` resizing overhead, the `concat` method is heavily optimized in C++ by the JavaScript engine and efficiently handles memory allocation and element copying without the overhead of interpreted JavaScript loops.
**Action:** Always prefer `Array.prototype.concat()` over manual `for` loop copying when merging large arrays, as it is both faster and vastly more readable.
## 2026-02-07 - AdGuardService Top-K Optimization
**Learning:** For small fixed-size top-K lists (e.g., top 10 domains), maintaining a sorted array via linear insertion (O(N*k)) is significantly faster than sorting the array on every insertion (O(N * k log k)) or collecting all and sorting (O(N log N)). In high-frequency loops, avoiding function call overhead (like `sort` callbacks) yields measurable gains.
**Action:** When implementing "Top N" features, prefer manual insertion into a fixed-size array over `push` + `sort`.

## 2026-02-13 - Redundant Data Processing & Mock Mismatch
**Learning:** Always verify the actual return type of a service before "optimizing" data processing in a consumer. In this case, `Logs.controller.ts` was re-parsing `Date` and `number` objects that `AdGuardService` had already processed, wasting O(N) cycles. The existing unit test masked this by mocking the service to return raw strings, forcing the controller to handle them.
**Action:** When optimizing data handling, audit the data source first. Ensure mocks strictly match the service contract (e.g., using `Date` objects if the service returns them) to avoid enforcing redundant logic.

## 2026-02-20 - Numeric Parsing Optimization
**Learning:** Checking types (`typeof x === 'number'`) before parsing is significantly faster than unconditionally calling `parseFloat()`, especially when processing large datasets where inputs are often already numbers. Additionally, using `Math.round(x * 100) / 100` avoids the overhead of `toFixed()` string allocation and parsing.
**Action:** In data processing services, prioritize type checks and mathematical operations over string-based parsing for numeric transformations.

## 2026-02-21 - Top-K Early Exit Optimization
**Learning:** Adding an early exit check (`if (item <= smallest_top_k) continue`) to a Top-K manual insertion loop (O(N*K)) drastically reduces comparisons (~90% reduction for sorted or random data), effectively making the best-case complexity O(N).
**Action:** Always implement early exit checks in manual Top-K loops, especially for large datasets.

## 2026-03-05 - Array Operations vs String Manipulation
**Learning:** For parsing or masking simple structured strings (like IPv6 addresses), using `substring` combined with `indexOf` (e.g., manually counting delimiters in a loop) or `lastIndexOf` is measurably faster and more memory-efficient than `.split().slice().join()`. The array-based approach allocates new arrays and creates GC overhead that is easily avoided for simple parsing logic.
**Action:** When repeatedly masking or parsing specific parts of delimited strings, use `indexOf` or `lastIndexOf` and `substring` rather than splitting into arrays.

## 2026-03-05 - False Micro-Optimizations (Ternary Short-Circuiting)
**Learning:** JavaScript ternary operators (e.g., `condition ? a : b`) already short-circuit automatically. Swapping the order of conditions (e.g., checking `typeof x === 'number'` instead of `typeof x === 'string'`) provides no runtime performance benefit for mixed-type datasets, as the execution branches identically.
**Action:** Do not "optimize" ternary operator condition ordering based purely on expected data types; focus on reducing actual functional overhead like function calls or memory allocation.

## 2026-03-09 - String Prefix Checking in Hot Loops
**Learning:** In tight parsing loops iterating over thousands of items, extracting object properties to local variables and using strict equality (`===`) combined with `.indexOf("...") === 0` is measurably faster (~25-30%) than using the modern `.startsWith()` method due to reduced V8 function invocation overhead. Checking the most likely or fastest path (strict equality) first also improves short-circuiting.
**Action:** When evaluating string prefixes on large arrays in high-frequency paths, assign properties to local variables and prioritize `===` followed by `.indexOf("...") === 0` over `.startsWith()`.

## 2026-03-15 - Array Mapping vs Static Regex for Structured Strings
**Learning:** For checking structured strings like IP addresses against specific patterns (e.g., private IP ranges), using a pre-compiled, static Regular Expression is significantly faster and more memory-efficient than splitting the string into arrays and mapping over them (e.g., `.split('.').map(Number)`). The array-based approach incurs heavy overhead from intermediate array allocations and multiple callback invocations.
**Action:** When validating structured strings or checking specific segments (like IP octets), avoid `.split().map()` chains and instead use a well-crafted, static regular expression.

## 2026-03-15 - Security Implications of Regex for IP Validation
**Learning:** While static regular expressions can be faster than array splitting and mapping for checking structured strings like IP addresses, they can introduce severe security vulnerabilities (like SSRF bypasses) when used for validation. The original `.map(Number)` approach correctly parsed hexadecimal obfuscated IPs (e.g., `0x0a.0.0.1` becomes `10.0.0.1` because `Number("0x0a") === 10`). A standard regex only checks for base-10 representations, allowing hex-encoded private IPs to bypass the check.
**Action:** Do not use string-matching regexes for security-critical validation of network addresses where standard parsing functions (like `Number()` or native URL parsers) provide robust handling of obfuscation techniques. Revert this optimization as it sacrifices correctness and security for a false micro-optimization.

## 2026-03-24 - False Micro-Optimization (Manual Array Merging)
**Learning:** In V8/Node.js environments, manually creating a pre-allocated array and using `for` loops to copy elements from two existing arrays is surprisingly slower (~35%) than using native `Array.prototype.concat()`. While manual pre-allocation avoids `push()` resizing overhead, the `concat` method is heavily optimized in C++ by the JavaScript engine and efficiently handles memory allocation and element copying without the overhead of interpreted JavaScript loops.
**Action:** Always prefer `Array.prototype.concat()` over manual `for` loop copying when merging large arrays, as it is both faster and vastly more readable.

