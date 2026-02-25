import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import { RawAdGuardData, RawLogEntry } from "ui5/aghd/model/AdGuardTypes";

QUnit.module("AdGuardService Slowest Queries Benchmark", {
    beforeEach: function () {
        AdGuardService.getInstance().clearCache();
    },
    afterEach: function () {
        AdGuardService.getInstance().clearCache();
    }
});

QUnit.test("getSlowestQueries performance with high repetition and mixed values", async function (assert) {
    const service = AdGuardService.getInstance();
    const count = 5000;
    const uniqueDomains = 100;

    // Create dataset with many repetitions per domain
    const entries: RawLogEntry[] = Array.from({ length: count }, (_, i) => {
        const domainIndex = i % uniqueDomains;
        // Most values small (1-10ms), some large (100-500ms) to fill top 5
        // Every 10th entry is large for a domain
        const isLarge = (i % 10) === 0;
        const elapsedMs = isLarge ? 100 + (Math.random() * 400) : 1 + (Math.random() * 9);

        return {
            answer: [],
            original_answer: [],
            upstream: "1.1.1.1",
            status: "OK",
            question: { type: "A", name: `domain${domainIndex}.com`, class: "IN" },
            client: "192.168.1.100",
            time: "2023-01-01T12:00:00Z",
            elapsedMs: elapsedMs,
            reason: "Filtered",
            filterId: 0,
            rule: ""
        };
    });

    const mockResponse: RawAdGuardData = { data: entries };

    const originalFetch = globalThis.fetch;
    // @ts-expect-error: Mocking fetch
    globalThis.fetch = async () => {
        // Return a copy to simulate parsing overhead if needed, though here we care about processing
        const copy = JSON.parse(JSON.stringify(mockResponse)) as RawAdGuardData;
        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(copy)),
            json: async () => Promise.resolve(copy)
        } as Response);
    };

    try {
        const start = performance.now();
        await service.getSlowestQueries(count);
        const end = performance.now();
        const duration = end - start;

        console.log(`BENCHMARK_SLOWEST_QUERIES: Processed ${count} entries in ${duration.toFixed(4)}ms`);
        assert.ok(true, `Benchmark completed in ${duration.toFixed(4)}ms`);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
