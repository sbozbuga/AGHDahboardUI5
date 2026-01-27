## 2025-05-18 - XSS in AI Output
**Vulnerability:** Untrusted output from Generative AI (Gemini) was being processed with simple regex replacements to generate HTML, allowing potential XSS if the AI returned malicious tags.
**Learning:** LLM outputs must be treated as untrusted user input. Even "safe" prompts can be manipulated or hallucinate malicious content.
**Prevention:** Always sanitize/encode AI output before rendering it as HTML. Use `encodeXML` (or equivalent) first, then apply whitelisted formatting if necessary, rather than assuming the output is safe text.
