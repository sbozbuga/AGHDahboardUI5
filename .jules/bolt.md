## 2024-06-03 - Format Insights Regex Optimization
**Learning:** For string formatting and markdown parsing, applying global Regex replacements on the entire string is significantly faster and allocates less memory than splitting the string into an array of lines and applying the Regex iteratively.
**Action:** Always prefer global regex replaces on full text blobs over line-by-line regex iteration when processing strings.
