import formatter from "ui5/aghd/model/formatter";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("formatter Benchmark");

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
