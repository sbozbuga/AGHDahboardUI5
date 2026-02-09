## 2026-01-26 - UI5 Form Submission
**Learning:** UI5 Inputs do not trigger form submission on Enter key by default; explicit `submit` event handlers are required.
**Action:** Always bind `submit` event to the submit action on `Input` controls in forms.

## 2026-01-27 - Inline Validation
**Learning:** Using `ValueState.Error` on Inputs provides better accessibility and UX than `MessageBox` for validation, as it keeps context and focus.
**Action:** Implement inline validation with `liveChange` handlers to clear errors immediately upon user correction.

## 2026-01-29 - Login UX Polish
**Learning:** Autofocusing the primary input on login screens significantly reduces interaction cost. `Label`'s `required` property provides a standard, accessible visual cue without custom CSS.
**Action:** Use `onAfterRendering` to focus initial inputs and `required="true"` on labels for all form fields.

## 2026-01-31 - Dashboard Empty States
**Learning:** Tables nested in Dashboard Cards look "broken" when empty if they rely on the default no-data text. Specific messages provide immediate system status context.
**Action:** Always define context-specific `noDataText` (e.g., "No active clients found") for tables in dashboard widgets.

## 2026-02-01 - Accessible Icon Buttons in Dialogs
**Learning:** Icon-only buttons in dynamic table rows (like "Remove" actions) are frequently missed during accessibility sweeps because they lack text. This creates a "trap" for screen reader users who encounter an unlabeled button.
**Action:** Always verify icon-only buttons in dialogs have explicit `tooltip` or `ariaLabelledBy` properties during implementation, not just during QA.

## 2026-02-04 - Semantic Icons Accessibility
**Learning:** `core:Icon` defaults to `decorative="true"`, causing screen readers to ignore it even if `tooltip` or `alt` is set.
**Action:** Always set `decorative="false"` and provide `alt`/`tooltip` for icons that convey status or meaning (not just decoration).

## 2026-02-05 - Password Visibility Toggle
**Learning:** `sap.m.Input` with `type="Password"` does not provide a native visibility toggle.
**Action:** Implement manual toggle using `showValueHelp="true"`, `valueHelpIconSrc="sap-icon://show"`, and handling `valueHelpRequest` to switch `type`.

## 2026-02-06 - Dashboard Tile Interactivity
**Learning:** Static dashboard tiles that look interactive (due to hover effects or layout) but don't navigate frustrate users. Linking all summary tiles to their detailed views, even without specific filters, significantly improves perceived responsiveness and utility.
**Action:** Ensure all dashboard summary tiles have `press` events navigating to the relevant detail view, and provide descriptive tooltips.

## 2026-02-08 - Accessible Form Validation Focus
**Learning:** While `ValueState.Error` provides visual feedback, standard validation logic often leaves focus on the submit button, forcing keyboard users to tab backwards. Programmatically focusing the first invalid input significantly improves error recovery flow.
**Action:** Always implement focus management in form validation logic to target the first invalid field.

## 2026-02-12 - Dynamic List Item Tooltips
**Learning:** Navigation lists in dashboards often lack context for screen readers. Adding dynamic tooltips (e.g., 'View logs for {name}') to `ColumnListItem` provides explicit action descriptions without cluttering the UI.
**Action:** Always add dynamic tooltips to interactive list items that perform navigation or detailed actions.
