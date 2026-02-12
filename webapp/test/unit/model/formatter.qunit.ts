import formatter from "ui5/aghd/model/formatter";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("formatter - formatElapsed");

QUnit.test("Should format elapsed time correctly", function (assert) {
    assert.strictEqual(formatter.formatElapsed(123.456), "123.456", "Formats 123.456 correctly");
    assert.strictEqual(formatter.formatElapsed(0.1234), "0.123", "Formats 0.1234 correctly (rounded)");
    assert.strictEqual(formatter.formatElapsed(10), "10.000", "Formats 10 correctly");
    assert.strictEqual(formatter.formatElapsed(0), "0.000", "Formats 0 correctly");
});

QUnit.test("Should handle null or undefined", function (assert) {
    assert.strictEqual(formatter.formatElapsed(null), "0.000", "Returns 0.000 for null");
    assert.strictEqual(formatter.formatElapsed(undefined), "0.000", "Returns 0.000 for undefined");
});

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
