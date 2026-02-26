import LogService from "ui5/aghd/service/LogService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import { RawAdGuardData, RawLogEntry } from "ui5/aghd/model/AdGuardTypes";

QUnit.module("LogService Performance");

QUnit.test("getQueryLog performance with large dataset (5000 items)", async function (assert) {
    const service = LogService.getInstance();
    const count = 5000;

    // Create large dataset
    const entries: RawLogEntry[] = Array.from({ length: count }, (_, i) => ({
        answer: [],
        original_answer: [],
        upstream: "1.1.1.1",
        status: "OK",
        question: { type: "A", name: `domain${i}.com`, class: "IN" },
        client: "192.168.1.100",
        time: "2023-01-01T12:00:00Z",
        elapsedMs: 123.45, // Number as it often comes from raw JSON if parsed
        reason: "FilteredBlackList",
        filterId: 0,
        rule: ""
    }));

    const mockResponse: RawAdGuardData = { data: entries };

    const originalFetch = globalThis.fetch;
    // @ts-expect-error: Mocking fetch for testing purposes
    globalThis.fetch = async () => {
        // Return a copy to simulate fresh parsing each time
        const copy = JSON.parse(JSON.stringify(mockResponse)) as RawAdGuardData;
        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(copy)),
            json: async () => Promise.resolve(copy)
        });
    };

    try {
        const start = performance.now();
        await service.getQueryLog(count, 0);
        const end = performance.now();
        const duration = end - start;
        console.log(`BENCHMARK_RESULT: Processed ${count} entries in ${duration.toFixed(2)}ms`);

        // This assertion is just to print the duration in the test output
        assert.ok(true, `Processed ${count} entries in ${duration.toFixed(2)}ms`);

        // We can set a loose threshold just to ensure it's not disastrously slow,
        // but real performance testing is about relative improvement.
        assert.ok(duration < 5000, "Should process within 5 seconds");

    } finally {
        globalThis.fetch = originalFetch;
    }
});
