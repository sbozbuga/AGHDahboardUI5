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
