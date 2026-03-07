## 2024-05-22 - Missing Accessibility Labels on Card Tables
**Learning:** Tables nested inside Cards (`sap.f.Card`) do not automatically inherit the Card's header as their accessible label. Screen readers may announce "Table" without context.
**Action:** Explicitly set `ariaLabelledBy` on the `Table` control to point to the Card's header ID or title element.

## 2026-02-16 - Responsive SearchField in OverflowToolbar
**Learning:** Setting a percentage width on `SearchField` inside an `OverflowToolbar` can lead to poor responsiveness. `width='auto'` without constraints may collapse.
**Action:** Use `OverflowToolbarLayoutData` with `minWidth`, `maxWidth`, and `shrinkable='true'` inside the `layoutData` aggregation to ensure proper sizing.

## 2026-02-17 - Secondary Actions in Navigation List Items
**Learning:** Adding a secondary action (e.g., "Copy" button) inside a `ColumnListItem` with `type="Navigation"` allows for quick utility without navigating away. Wrapping the text and button in an `HBox` with `wrap="Wrap"` ensures responsiveness on smaller screens.
**Action:** Use `HBox` with `alignItems="Center"` and `wrap="Wrap"` to group primary text and secondary action buttons within table cells.

## 2026-02-18 - Visual Feedback for Icon-Only Actions
**Learning:** Toast notifications alone are insufficient for repeated icon-only actions (like "Copy"). Users miss the connection to the source button.
**Action:** Implement immediate icon change (e.g., to "accept") on the triggering button alongside the toast for clearer feedback.

## 2026-02-26 - Reducing Table Clutter with Hover-Only Actions
**Learning:** In dense tables with multiple columns, persistent secondary action buttons (like "Copy") add significant visual noise. Using CSS to hide them by default (`opacity: 0`) and show on row hover (`tr:hover .action`) provides a cleaner interface while maintaining accessibility via focus states.
**Action:** Apply a utility class (e.g., `copyButton`) that manages opacity transitions for secondary row actions, ensuring focus visibility for keyboard users.

## 2026-03-01 - Linking Helper Text to Inputs with ariaDescribedBy
**Learning:** Helper `<Text>` tags placed near `<Input>` or `<TextArea>` components are visually associated but ignored by screen readers unless explicitly linked.
**Action:** Use the `ariaDescribedBy` property on the input control, setting it to the `id` of the descriptive `<Text>` element to ensure full accessibility.

## 2026-03-02 - Missing i18n Keys for Icon-Only Button Tooltips
**Learning:** Using an undefined i18n key for the `tooltip` property on icon-only buttons causes UI5 to fall back to displaying the raw key string (e.g., `viewSettingsTooltip`). For screen reader users, this results in unhelpful, developer-centric announcements rather than meaningful labels.
**Action:** Always verify that every i18n key referenced in the XML view exists in the corresponding `i18n.properties` file to ensure proper localization and accessibility.

## 2024-03-06 - Fixing SAPUI5 XML View ARIA Labels
**Learning:** In SAPUI5, `aria-label` is not a valid native property for standard controls like `sap.m.ComboBox` and `sap.m.Input` in XML views. Using it causes validation errors or it might be ignored.
**Action:** Instead, use `ariaLabelledBy` (referencing a visible label or `sap.ui.core.InvisibleText`), `tooltip`, or `placeholder` to ensure screen reader accessibility. I used `tooltip` mapped to i18n keys for `ComboBox` and `Input` in this instance.
