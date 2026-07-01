## 2025-07-01 - Explicit ARIA Labels for Table Form Inputs
**Learning:** Screen readers do not automatically associate `sap.m.Column` headers with interactive inputs (`sap.m.ComboBox`, `sap.m.Input`) inside responsive `sap.m.Table` cells. Users on assistive technologies lose the column context entirely when tabbing through table filters.
**Action:** When placing form controls inside `sap.m.Table` cells, always explicitly provide `id` attributes on the `sap.m.Column` headers and link them to the inputs using `ariaLabelledBy`.
