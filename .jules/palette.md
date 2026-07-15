## 2025-07-01 - Explicit ARIA Labels for Table Form Inputs
**Learning:** Screen readers do not automatically associate `sap.m.Column` headers with interactive inputs (`sap.m.ComboBox`, `sap.m.Input`) inside responsive `sap.m.Table` cells. Users on assistive technologies lose the column context entirely when tabbing through table filters.
**Action:** When placing form controls inside `sap.m.Table` cells, always explicitly provide `id` attributes on the `sap.m.Column` headers and link them to the inputs using `ariaLabelledBy`.

## 2026-07-15 - Prevent False Affordances
**Learning:** Action buttons that operate on lists (like 'Copy All' or 'Clear All') should not appear interactive when the list is empty, as this creates false affordances and confuses users.
**Action:** Bind the `enabled` property of list-dependent action buttons to the length of their associated data model to ensure they are only active when actionable data exists.
