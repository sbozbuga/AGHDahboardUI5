## 2024-05-22 - Missing Accessibility Labels on Card Tables
**Learning:** Tables nested inside Cards (`sap.f.Card`) do not automatically inherit the Card's header as their accessible label. Screen readers may announce "Table" without context.
**Action:** Explicitly set `ariaLabelledBy` on the `Table` control to point to the Card's header ID or title element.

## 2026-02-16 - Responsive SearchField in OverflowToolbar
**Learning:** Setting a percentage width on `SearchField` inside an `OverflowToolbar` can lead to poor responsiveness. `width='auto'` without constraints may collapse.
**Action:** Use `OverflowToolbarLayoutData` with `minWidth`, `maxWidth`, and `shrinkable='true'` inside the `layoutData` aggregation to ensure proper sizing.
