## 2025-05-18 - XSS in AI Output
**Vulnerability:** Untrusted output from Generative AI (Gemini) was being processed with simple regex replacements to generate HTML, allowing potential XSS if the AI returned malicious tags.
**Learning:** LLM outputs must be treated as untrusted user input. Even "safe" prompts can be manipulated or hallucinate malicious content.
**Prevention:** Always sanitize/encode AI output before rendering it as HTML. Use `encodeXML` (or equivalent) first, then apply whitelisted formatting if necessary, rather than assuming the output is safe text.

## 2025-05-20 - Log Injection into AI Context
**Vulnerability:** Aggregated log data (domains, client names) containing control characters or newlines could manipulate the AI system prompt (Prompt Injection), potentially causing the AI to ignore instructions or leak context.
**Learning:** Data fed into LLM prompts via string interpolation is essentially code injection. Simple JSON serialization is insufficient protection against semantic manipulation.
**Prevention:** Sanitize all variable input into prompts by stripping control characters and normalizing whitespace before serialization.

## 2025-05-21 - API Key Leakage in Error Logs
**Vulnerability:** Upstream API errors often include the request URL. When using SDKs or REST calls with API keys, logging the raw error object to the console can expose these credentials.
**Learning:** Standard error logging (`console.error(error)`) is unsafe for operations involving secrets. SDK-thrown errors are not guaranteed to be sanitized.
**Prevention:** Always catch errors from sensitive operations and explicitly redact known secrets (e.g., `msg.split(apiKey).join("[REDACTED]")`) before logging or re-throwing.

## 2025-05-21 - Unicode Control Character Injection
**Vulnerability:** Standard ASCII control character stripping (`\x00-\x1F`) fails to remove Unicode C1 control characters (`\x80-\x9F`), which can still cause issues in downstream processing or display.
**Learning:** Regex for "control characters" must account for Unicode ranges.
**Prevention:** Use expanded regex `[\x00-\x1F\x7F-\x9F]` to cover both C0 and C1 control sets.

## 2026-01-31 - Missing CSP in UI5 Application
**Vulnerability:** The application lacked a Content Security Policy (CSP), exposing it to Cross-Site Scripting (XSS) and data exfiltration risks, particularly concerning for a dashboard handling sensitive logs and API keys.
**Learning:** Single Page Applications (SPAs) connecting to external APIs (Gemini) must strictly whitelist those connections. However, UI5 (OpenUI5) requires `unsafe-eval` for module loading/bindings and `unsafe-inline` for styles, limiting the strictness of the CSP.
**Prevention:** Implement a CSP early in development. For UI5 apps, allow specific endpoints (like `generativelanguage.googleapis.com`) and development sockets (`ws:`), but accept the trade-off of allowing `unsafe-eval` as a framework constraint.

## 2025-05-22 - API Key Exposure in URL
**Vulnerability:** The Gemini API key was passed as a query parameter in the `getAvailableModels` request, potentially exposing it in logs and browser history.
**Learning:** Even when using HTTPS, query parameters are part of the URL and can be logged. Headers are the preferred way to transmit secrets.
**Prevention:** Use HTTP headers (e.g., `x-goog-api-key`) for API authentication whenever supported by the provider.

## 2025-01-31 - Missing Security Headers in Nginx
**Vulnerability:** The Nginx configuration lacked standard security headers, exposing the application to Clickjacking, MIME sniffing, and information leakage.
**Learning:** Even for static deployments of UI5 apps, the web server (Nginx) must be explicitly hardened. CSP must be carefully crafted to allow UI5's dynamic nature (`unsafe-eval`, `unsafe-inline`) while restricting external connections.
**Prevention:** Include a hardened `nginx.conf` template in the repository to guide secure deployment.
