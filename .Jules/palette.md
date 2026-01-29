## 2026-01-26 - UI5 Form Submission
**Learning:** UI5 Inputs do not trigger form submission on Enter key by default; explicit `submit` event handlers are required.
**Action:** Always bind `submit` event to the submit action on `Input` controls in forms.

## 2026-01-27 - Inline Validation
**Learning:** Using `ValueState.Error` on Inputs provides better accessibility and UX than `MessageBox` for validation, as it keeps context and focus.
**Action:** Implement inline validation with `liveChange` handlers to clear errors immediately upon user correction.

## 2026-01-29 - Login UX Polish
**Learning:** Autofocusing the primary input on login screens significantly reduces interaction cost. `Label`'s `required` property provides a standard, accessible visual cue without custom CSS.
**Action:** Use `onAfterRendering` to focus initial inputs and `required="true"` on labels for all form fields.
