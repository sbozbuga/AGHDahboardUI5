import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("StatsService Loop Optimization Benchmark");

QUnit.test("Benchmark: for-of vs traditional for-loop", function (assert: Assert) {
	// Generate a large mock array
	const dataSize = 10000;
	const array = new Array<{ elapsedMs: number }>(dataSize);
	for (let i = 0; i < dataSize; i++) {
		array[i] = { elapsedMs: i * 1.5 };
	}

	// Benchmark for-of
	const startForOf = performance.now();
	let sumForOf = 0;
	for (const item of array) {
		sumForOf += item.elapsedMs;
	}
	const endForOf = performance.now();
	const timeForOf = endForOf - startForOf;

	// Benchmark traditional for loop
	const startForLoop = performance.now();
	let sumForLoop = 0;
	const len = array.length;
	for (let i = 0; i < len; i++) {
		sumForLoop += array[i].elapsedMs;
	}
	const endForLoop = performance.now();
	const timeForLoop = endForLoop - startForLoop;

	assert.strictEqual(sumForOf, sumForLoop, "Sums should match");

	assert.ok(
		timeForLoop !== undefined,
		`traditional for time: ${timeForLoop.toFixed(4)}ms, for-of time: ${timeForOf.toFixed(4)}ms`
	);
});
