## 2024-06-03 - Format Insights Regex Optimization
**Learning:** For string formatting and markdown parsing, applying global Regex replacements on the entire string is significantly faster and allocates less memory than splitting the string into an array of lines and applying the Regex iteratively.
**Action:** Always prefer global regex replaces on full text blobs over line-by-line regex iteration when processing strings.

## $(date +%Y-%m-%d) - Number Constructor Fast Path in High-Frequency Loops
**Learning:** In high-frequency JavaScript/TypeScript execution paths, a fast-path type check before type coercion (e.g., `typeof value === 'number' ? value : Number(value)`) is measurably faster than indiscriminately calling the `Number()` constructor because it avoids unnecessary constructor and object coercion overhead when the input is already a primitive number.
**Action:** Use fast-path type checking for numeric coercion within large loops or high-frequency processing functions, especially when the data source frequently provides pre-parsed numbers.
## 2024-06-03 - Pre-allocated Array Loop Optimization
**Learning:** In high-frequency array processing (like large log sets), using a traditional `for` loop (`for (let i = 0; i < len; i++)`) with a pre-allocated array (`new Array(len)`) and indexed assignment (`array[i] = value`) is measurably faster and produces less garbage collection overhead compared to a `for...of` loop combined with `Array.prototype.push()`.
**Action:** When transforming large arrays where the final size is known upfront, prefer pre-allocating the array and using a traditional `for` loop with index-based assignment.
## 2024-07-29 - Fast-path bracket regex replacement
**Learning:** Using `String.prototype.replace(regex)` unconditionally introduces unnecessary regex engine overhead. Fast-path these replacements by verifying the presence of the target character with `indexOf()` before applying the regex.
**Action:** When doing string replacements, verify the presence of target character with `indexOf()` before applying regex.
## 2024-08-05 - Replacing for...of with traditional for loop in V8
**Learning:** In high-frequency loop processing over large data arrays in V8 (such as parsing thousands of log entries), a traditional `for` loop (`for (let i = 0; i < len; i++)`) is measurably faster and avoids the Iterator protocol overhead and garbage collection pressure caused by `for...of`.
**Action:** Prefer traditional `for` loops with pre-computed length (`const len = arr.length`) over `for...of` when iterating through large, high-cardinality data arrays.
