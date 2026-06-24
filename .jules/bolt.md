## 2024-06-03 - Format Insights Regex Optimization
**Learning:** For string formatting and markdown parsing, applying global Regex replacements on the entire string is significantly faster and allocates less memory than splitting the string into an array of lines and applying the Regex iteratively.
**Action:** Always prefer global regex replaces on full text blobs over line-by-line regex iteration when processing strings.

## $(date +%Y-%m-%d) - Number Constructor Fast Path in High-Frequency Loops
**Learning:** In high-frequency JavaScript/TypeScript execution paths, a fast-path type check before type coercion (e.g., `typeof value === 'number' ? value : Number(value)`) is measurably faster than indiscriminately calling the `Number()` constructor because it avoids unnecessary constructor and object coercion overhead when the input is already a primitive number.
**Action:** Use fast-path type checking for numeric coercion within large loops or high-frequency processing functions, especially when the data source frequently provides pre-parsed numbers.
