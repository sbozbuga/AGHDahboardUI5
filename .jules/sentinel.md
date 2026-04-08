## 2024-04-08 - Obfuscated IP Anonymization Bypass
**Vulnerability:** The PII anonymization logic used a strict regex (`/^(\d{1,3}\.){3}\d{1,3}$/`) to identify IPv4 addresses. This allowed obfuscated IP addresses (like `0x0a.0.0.1`) to bypass detection and be sent to a third-party AI provider unredacted.
**Learning:** Standard decimal regexes are insufficient for validating or parsing IP addresses, as they fail to match hex/octal obfuscated IPs, creating a security gap.
**Prevention:** Always use `.split(".").map(Number)` to validate IP address components, which correctly evaluates hex/octal obfuscated IPs natively.
