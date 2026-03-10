import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Logs Controller forEach Optimization Benchmark");

QUnit.test("Benchmark: forEach vs for-of", function (assert: Assert) {
    // Generate a large mock array
    const dataSize = 10000;
    const array = new Array<{ value: number }>(dataSize);
    for (let i = 0; i < dataSize; i++) {
        array[i] = { value: i };
    }

    // Benchmark forEach
    const startForEach = performance.now();
    let sumForEach = 0;
    array.forEach(item => {
        sumForEach += item.value;
    });
    const endForEach = performance.now();
    const timeForEach = endForEach - startForEach;

    // Benchmark for-of
    const startForOf = performance.now();
    let sumForOf = 0;
    for (const item of array) {
        sumForOf += item.value;
    }
    const endForOf = performance.now();
    const timeForOf = endForOf - startForOf;

    assert.strictEqual(sumForEach, sumForOf, "Sums should match");

    // We expect for-of to be faster or at least similar, but in performance
    // tests, asserting on time can be flaky. We just log it and assert it runs.
    assert.ok(timeForOf !== undefined, `for-of time: ${timeForOf.toFixed(4)}ms, forEach time: ${timeForEach.toFixed(4)}ms`);
});
