## 2024-05-22 - Missing Accessibility Labels on Card Tables
**Learning:** Tables nested inside Cards (`sap.f.Card`) do not automatically inherit the Card's header as their accessible label. Screen readers may announce "Table" without context.
**Action:** Explicitly set `ariaLabelledBy` on the `Table` control to point to the Card's header ID or title element.
