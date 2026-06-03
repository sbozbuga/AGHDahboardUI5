import formatter from "ui5/aghd/model/formatter";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("formatter Benchmark");

QUnit.test("formatInsights performance vs iterations", function (assert: Assert) {
    const text = "This is a **bold** statement.\nAnd another **bold** one.\n* List item 1\n* List item 2\nJust normal text\n* List item 3\n* List item 4\nMore normal text.";
    const iterations = 10000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        formatter.formatInsights(text);
    }
    const end = performance.now();
    const duration = end - start;

    console.log(`BENCHMARK_FORMAT_INSIGHTS: Processed ${iterations} iterations in ${duration.toFixed(4)}ms`);
    assert.ok(true, `Benchmark completed in ${duration.toFixed(4)}ms`);
});

QUnit.test("formatElapsedState vs typeof + Number", function (assert: Assert) {
	const iterations = 10000;

	const start1 = performance.now();
	for (let i = 0; i < iterations; i++) {
		formatter.formatElapsedState(250);
		formatter.formatElapsedState("250");
		formatter.formatElapsedState(null);
		formatter.formatElapsedStateText(250);
		formatter.formatElapsedStateText("250");
		formatter.formatElapsedStateText(null);
		formatter.formatElapsedColor(250);
		formatter.formatElapsedColor("250");
		formatter.formatElapsedColor(null);
		formatter.formatNumber(250);
		formatter.formatNumber("250");
		formatter.formatNumber(null);
	}
	const time1 = performance.now() - start1;

	assert.ok(true, `Current Time: ${time1}ms`);
});
