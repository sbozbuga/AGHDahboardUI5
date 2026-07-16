## 2025-07-15 - Unsafe Eval in Content Security Policy
**Vulnerability:** The 'unsafe-eval' directive was present in the `script-src` of the Content-Security-Policy in `webapp/index.html`.
**Learning:** It was likely included by default or during early development when relying on framework features that evaluated strings, but modern UI5 applications and pre-compiled views generally don't require it, opening a vector for XSS if an attacker can inject a string to be evaluated.
**Prevention:** Always verify if `'unsafe-eval'` is strictly necessary for the application framework. For OpenUI5/SAPUI5, it is best practice to remove it and ensure views are pre-compiled and don't rely on runtime evaluation of arbitrary strings.
