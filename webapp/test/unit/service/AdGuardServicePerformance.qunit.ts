import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import { RawAdGuardData } from "ui5/aghd/model/AdGuardTypes";

QUnit.module("AdGuardService Performance", {
    beforeEach: function () {
        AdGuardService.getInstance().clearCache();
    },
    afterEach: function () {
        AdGuardService.getInstance().clearCache();
    }
});

QUnit.test("getSlowestQueries caching behavior", async function (assert) {
    const service = AdGuardService.getInstance();

    // Create dummy data
    const entries = Array.from({ length: 10 }, (_, i) => ({
        answer: [],
        original_answer: [],
        upstream: "1.1.1.1",
        status: "OK",
        question: { type: "A", name: `domain${i}.com`, class: "IN" },
        client: "192.168.1.100",
        time: "2023-01-01T12:00:00Z",
        elapsedMs: 100,
        reason: "NotFilteredNotFound",
        filterId: 0,
        rule: ""
    }));

    const mockResponse: RawAdGuardData = { data: entries };
    let fetchCount = 0;

    const originalFetch = globalThis.fetch;
    // @ts-expect-error: Mocking fetch
    globalThis.fetch = async () => {
        fetchCount++;
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(mockResponse)),
            json: async () => Promise.resolve(mockResponse)
        });
    };

    try {
        // First call
        const start1 = performance.now();
        await service.getSlowestQueries(50);
        const end1 = performance.now();

        assert.strictEqual(fetchCount, 1, "First call should trigger fetch");

        // Second call (immediately)
        const start2 = performance.now();
        await service.getSlowestQueries(50);
        const end2 = performance.now();

        // If caching is NOT implemented, fetchCount should be 2.
        // If caching IS implemented, fetchCount should be 1.
        // We assert for CURRENT behavior (no cache) first to establish baseline.
        // After implementation, we will update this assertion.

        console.log(`Call 1 time: ${end1 - start1}ms`);
        console.log(`Call 2 time: ${end2 - start2}ms`);
        console.log(`Total fetches: ${fetchCount}`);

        assert.strictEqual(fetchCount, 1, "Optimization confirmed: Only 1 fetch occurred (Cached)");

    } finally {
        globalThis.fetch = originalFetch;
    }
});
