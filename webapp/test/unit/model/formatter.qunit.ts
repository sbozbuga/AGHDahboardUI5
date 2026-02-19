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

QUnit.module("formatter - formatElapsedState");

QUnit.test("Should format elapsed time to value state", function (assert) {
    assert.strictEqual(formatter.formatElapsedState(600), "Error", "> 500ms should be Error");
    assert.strictEqual(formatter.formatElapsedState(500), "Warning", "500ms should be Warning (edge case)");
    assert.strictEqual(formatter.formatElapsedState(201), "Warning", "> 200ms should be Warning");
    assert.strictEqual(formatter.formatElapsedState(200), "None", "200ms should be None (edge case)");
    assert.strictEqual(formatter.formatElapsedState(50), "None", "< 200ms should be None");
    assert.strictEqual(formatter.formatElapsedState(undefined), "None", "undefined should be None");
    assert.strictEqual(formatter.formatElapsedState(null), "None", "null should be None");
    assert.strictEqual(formatter.formatElapsedState("600"), "Error", "String '600' should be Error");
});

QUnit.module("formatter - formatElapsedStateText");

QUnit.test("Should format elapsed time to state text", function (assert) {
    assert.strictEqual(formatter.formatElapsedStateText(600), "Critical (> 500ms)", "> 500ms should be Critical (> 500ms)");
    assert.strictEqual(formatter.formatElapsedStateText(500), "Warning (> 200ms)", "500ms should be Warning (> 200ms) (edge case)");
    assert.strictEqual(formatter.formatElapsedStateText(201), "Warning (> 200ms)", "> 200ms should be Warning (> 200ms)");
    assert.strictEqual(formatter.formatElapsedStateText(200), "Good (< 200ms)", "200ms should be Good (< 200ms) (edge case)");
    assert.strictEqual(formatter.formatElapsedStateText(50), "Good (< 200ms)", "< 200ms should be Good (< 200ms)");
    assert.strictEqual(formatter.formatElapsedStateText(undefined), "None", "undefined should be None");
    assert.strictEqual(formatter.formatElapsedStateText(null), "None", "null should be None");
    assert.strictEqual(formatter.formatElapsedStateText("600"), "Critical (> 500ms)", "String '600' should be Critical (> 500ms)");
});

QUnit.module("formatter - formatElapsedColor");

QUnit.test("Should format elapsed time to value color", function (assert) {
    assert.strictEqual(formatter.formatElapsedColor(600), "Error", "> 500ms should be Error");
    assert.strictEqual(formatter.formatElapsedColor(500), "Critical", "500ms should be Critical (edge case)");
    assert.strictEqual(formatter.formatElapsedColor(201), "Critical", "> 200ms should be Critical");
    assert.strictEqual(formatter.formatElapsedColor(200), "Good", "200ms should be Good (edge case)");
    assert.strictEqual(formatter.formatElapsedColor(50), "Good", "< 200ms should be Good");
    assert.strictEqual(formatter.formatElapsedColor(undefined), "Neutral", "undefined should be Neutral");
    assert.strictEqual(formatter.formatElapsedColor(null), "Neutral", "null should be Neutral");
    assert.strictEqual(formatter.formatElapsedColor("600"), "Error", "String '600' should be Error");
});

QUnit.module("formatter - formatMessage");

QUnit.test("Should format message correctly", function (assert) {
    assert.strictEqual(formatter.formatMessage("Hello {0}", ["World"]), "Hello World", "Formats message correctly");
});
