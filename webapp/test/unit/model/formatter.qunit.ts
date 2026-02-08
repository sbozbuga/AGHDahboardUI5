import formatter from "ui5/aghd/model/formatter";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("formatter - slowestTooltip");

QUnit.test("Should format sorted array correctly without re-sorting", function (assert) {
    // Test case 1: Already sorted descending (standard case from AdGuardService)
    const input1 = [100.123, 50.456, 10.789];
    const expected1 = "100.123 ms\n50.456 ms\n10.789 ms";
    assert.strictEqual(formatter.slowestTooltip(input1), expected1, "Formats correctly");

    // Test case 2: Sorted ascending (verification of optimization)
    // Current behavior sorts descending: "30.333 ms\n20.222 ms\n10.111 ms"
    // Optimized behavior preserves order: "10.111 ms\n20.222 ms\n30.333 ms"
    const input2 = [10.111, 20.222, 30.333];
    const expectedOptimized = "10.111 ms\n20.222 ms\n30.333 ms";

    assert.strictEqual(formatter.slowestTooltip(input2), expectedOptimized, "Preserves input order (does not re-sort)");
});

QUnit.test("Should handle empty or invalid input", function (assert) {
    assert.strictEqual(formatter.slowestTooltip(undefined), "", "Returns empty string for undefined");
    assert.strictEqual(formatter.slowestTooltip([]), "", "Returns empty string for empty array");
});
