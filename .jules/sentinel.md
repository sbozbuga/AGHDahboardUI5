## 2025-05-18 - XSS in AI Output
**Vulnerability:** Untrusted output from Generative AI (Gemini) was being processed with simple regex replacements to generate HTML, allowing potential XSS if the AI returned malicious tags.
**Learning:** LLM outputs must be treated as untrusted user input. Even "safe" prompts can be manipulated or hallucinate malicious content.
**Prevention:** Always sanitize/encode AI output before rendering it as HTML. Use `encodeXML` (or equivalent) first, then apply whitelisted formatting if necessary, rather than assuming the output is safe text.

## 2025-05-20 - Log Injection into AI Context
**Vulnerability:** Aggregated log data (domains, client names) containing control characters or newlines could manipulate the AI system prompt (Prompt Injection), potentially causing the AI to ignore instructions or leak context.
**Learning:** Data fed into LLM prompts via string interpolation is essentially code injection. Simple JSON serialization is insufficient protection against semantic manipulation.
**Prevention:** Sanitize all variable input into prompts by stripping control characters and normalizing whitespace before serialization.
