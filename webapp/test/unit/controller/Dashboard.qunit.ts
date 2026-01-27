import Dashboard from "ui5/aghd/controller/Dashboard.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Dashboard Controller Performance");

QUnit.test("Refresh Interval should be optimized", function (assert) {
    // @ts-expect-error: Accessing private static property for testing
    const interval = Dashboard.REFRESH_INTERVAL;

    // Optimization check: increased to 15000ms
    assert.strictEqual(interval, 15000, "Refresh interval is optimized to 15000ms");
});
