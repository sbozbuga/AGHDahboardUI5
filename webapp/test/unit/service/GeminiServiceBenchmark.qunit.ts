import GeminiService from "ui5/aghd/service/GeminiService";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Gemini Service - Benchmark");

QUnit.test("getTopK Performance", function (assert) {
    const service = GeminiService.getInstance();

    // Create a large dataset (e.g., 2000 items)
    const counts = new Map<string, number>();
    const size = 2000;

    // Fill with random data, but ensure some large values to make topK interesting
    for (let i = 0; i < size; i++) {
        counts.set(`Item-${i}`, Math.floor(Math.random() * 10000));
    }

    // Set explicit top values to verify correctness
    counts.set("Top1", 100000);
    counts.set("Top2", 99999);
    counts.set("Top3", 99998);
    counts.set("Top4", 99997);
    counts.set("Top5", 99996);

    const k = 5;

    // Warmup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    (service as any).getTopK(new Map([["A", 1]]), 1);

    const start = performance.now();

    // Run multiple times to average or just once if enough load
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const result = (service as any).getTopK(counts, k) as [string, number][];

    const end = performance.now();
    const duration = end - start;

    console.log(`[Benchmark] GeminiService.getTopK with N=${size}, K=${k}: ${duration.toFixed(4)}ms`);

    // Force failure to see the log
    // assert.ok(false, `[Benchmark] GeminiService.getTopK with N=${size}, K=${k}: ${duration.toFixed(4)}ms`);

    // Verify correctness
    assert.strictEqual(result.length, 5, "Should return 5 items");
    assert.strictEqual(result[0][0], "Top1", "Top1 should be first");
    assert.strictEqual(result[1][0], "Top2", "Top2 should be second");
    assert.strictEqual(result[2][0], "Top3", "Top3 should be third");
    assert.strictEqual(result[3][0], "Top4", "Top4 should be fourth");
    assert.strictEqual(result[4][0], "Top5", "Top5 should be fifth");
});
