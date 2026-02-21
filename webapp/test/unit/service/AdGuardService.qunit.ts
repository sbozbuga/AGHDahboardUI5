import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import { RawAdGuardData, RawAdGuardStats, RawLogEntry } from "ui5/aghd/model/AdGuardTypes";

QUnit.module("AdGuardService", {
    beforeEach: function () {
        AdGuardService.getInstance().clearCache();
    }
});

QUnit.test("getStats limits the processing of top domains", async function (assert) {
    const service = AdGuardService.getInstance();

    // Create a large list of 100 items
    const largeList = Array.from({ length: 100 }, (_, i) => ({
        domain: `domain${i}.com`,
        count: 1000 - i
    }));

    const mockResponse: RawAdGuardStats = {
        num_dns_queries: 1000,
        num_blocked_filtering: 100,
        avg_processing_time: 0.5,
        top_queried_domains: largeList,
        top_blocked_domains: [],
        top_clients: []
    };

    // Mock fetch
    const originalFetch = globalThis.fetch;
    // @ts-expect-error: Mocking fetch for testing purposes
    globalThis.fetch = async () => {
        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(mockResponse)),
            json: async () => Promise.resolve(mockResponse)
        });
    };

    try {
        const stats = await service.getStats();
        assert.strictEqual(stats.top_queried_domains.length, 10, "Should return only 10 items");
        assert.strictEqual(stats.top_queried_domains[0].name, "domain0.com", "First item should be correct");

    } finally {
        globalThis.fetch = originalFetch;
    }
});

QUnit.test("getQueryLog constructs correct URL with parameters", async function (assert) {
    const service = AdGuardService.getInstance();
    const mockResponse: RawAdGuardData = { data: [] };

    const originalFetch = globalThis.fetch;
    let capturedUrl: string = "";

    // @ts-expect-error: Mocking fetch for testing purposes
    globalThis.fetch = async (url: string) => {
        capturedUrl = url;
        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(mockResponse)),
            json: async () => Promise.resolve(mockResponse)
        });
    };

    try {
        // Test with special characters
        const filterStatus = "Filtered By Rule";
        await service.getQueryLog(10, 5, filterStatus);

        // Check URL construction
        // Use URL object to parse the captured URL (assuming relative URL works or preprending host)
        const urlObj = new URL(capturedUrl, "http://localhost");
        const params = urlObj.searchParams;

        assert.strictEqual(params.get("limit"), "10", "Limit param correct");
        assert.strictEqual(params.get("offset"), "5", "Offset param correct");
        assert.strictEqual(params.get("response_status"), filterStatus, "Status param correct and decoded");

    } finally {
        globalThis.fetch = originalFetch;
    }
});

QUnit.test("getQueryLog returns correctly processed LogEntry objects", async function (assert) {
    const service = AdGuardService.getInstance();

    const mockResponse: RawAdGuardData = {
        data: [
            {
                answer: [],
                original_answer: [],
                upstream: "1.1.1.1",
                status: "OK",
                question: { type: "A", name: "blocked.com", class: "IN" },
                client: "192.168.1.100",
                time: "2023-01-01T12:00:00Z",
                elapsedMs: "123.45" as unknown as number, // String in API
                reason: "FilteredBlackList",
                filterId: 0,
                rule: ""
            },
            {
                answer: [],
                original_answer: [],
                upstream: "1.1.1.1",
                status: "OK",
                question: { type: "A", name: "safe.com", class: "IN" },
                client: "192.168.1.100",
                time: "2023-01-02T12:00:00Z",
                elapsedMs: "50" as unknown as number,
                reason: "NotFilteredNotFound",
                filterId: 0,
                rule: ""
            }
        ]
    };

    const originalFetch = globalThis.fetch;
    // @ts-expect-error: Mocking fetch for testing purposes
    globalThis.fetch = async () => {
        // Return a DEEP COPY to simulate fresh network response,
        // because AdGuardService mutates the response in place.
        // We need to ensure we don't mutate the mock object reused in potential future tests (though here it's local).
        const copy = JSON.parse(JSON.stringify(mockResponse)) as RawAdGuardData;

        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(copy)),
            json: async () => Promise.resolve(copy)
        });
    };

    try {
        const logs = await service.getQueryLog(10, 0);

        assert.strictEqual(logs.data.length, 2, "Should return 2 items");

        // Check first item (Blocked)
        const item1 = logs.data[0];
        // Time is now kept as string for performance
        assert.strictEqual(typeof item1.time, "string", "Time should be a string (lazy parsing)");
        assert.strictEqual(item1.time, "2023-01-01T12:00:00Z", "Time value correct");
        assert.strictEqual(typeof item1.elapsedMs, "number", "elapsedMs should be number");
        assert.strictEqual(item1.elapsedMs, 123.45, "elapsedMs value correct");
        assert.strictEqual(item1.blocked, true, "Should be identified as blocked");

        // Check second item (Safe)
        const item2 = logs.data[1];
        assert.strictEqual(typeof item2.time, "string", "Time should be a string (lazy parsing)");
        assert.strictEqual(item2.time, "2023-01-02T12:00:00Z", "Time value correct");
        assert.strictEqual(item2.elapsedMs, 50, "elapsedMs value correct");
        assert.strictEqual(item2.blocked, false, "Should not be blocked");

    } finally {
        globalThis.fetch = originalFetch;
    }
});

QUnit.test("getSlowestQueries returns top 10 sorted items", async function (assert) {
    const service = AdGuardService.getInstance();

    // Create 50 log entries with random elapsed times
    const entries: RawLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        answer: [],
        original_answer: [],
        upstream: "1.1.1.1",
        status: "OK",
        question: { type: "A", name: `domain${i}.com`, class: "IN" },
        client: "192.168.1.100",
        time: "2023-01-01T12:00:00Z",
        elapsedMs: String((i % 10) * 100 + (Math.random() * 100)) as unknown as number, // Mixed values
        reason: "NotFilteredNotFound",
        filterId: 0,
        rule: ""
    }));

    // Explicitly set top values to verify sorting
    // Top 1: 5000ms
    entries[10].elapsedMs = "5000" as unknown as number;
    entries[10].question.name = "slowest.com";

    // Top 2: 4000ms
    entries[20].elapsedMs = "4000" as unknown as number;
    entries[20].question.name = "second.com";

    // Top 3..12: 3000..2100ms (10 items total needed, so we need 8 more high ones)
    for(let k=0; k<8; k++) {
        entries[30+k].elapsedMs = String(3000 - k*100) as unknown as number; // 3000, 2900, ..., 2300
        entries[30+k].question.name = `high${k}.com`;
    }

    const mockResponse: RawAdGuardData = { data: entries };

    const originalFetch = globalThis.fetch;
    // @ts-expect-error: Mocking fetch for testing purposes
    globalThis.fetch = async () => {
        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(mockResponse)),
            json: async () => Promise.resolve(mockResponse)
        });
    };

    try {
        const slowest = await service.getSlowestQueries(50);

        assert.strictEqual(slowest.length, 10, "Should return exactly 10 items");
        assert.strictEqual(slowest[0].domain, "slowest.com", "First item should be 'slowest.com' (5000ms)");
        assert.strictEqual(slowest[0].elapsedMs, 5000, "First item elapsedMs should be 5000");
        assert.strictEqual(slowest[1].domain, "second.com", "Second item should be 'second.com' (4000ms)");
        assert.strictEqual(slowest[1].elapsedMs, 4000, "Second item elapsedMs should be 4000");

        // Verify sorted order
        let prev = slowest[0].elapsedMs;
        for(let i=1; i<slowest.length; i++) {
            assert.ok(slowest[i].elapsedMs <= prev, `Item ${i} (${slowest[i].elapsedMs}) should be <= previous (${prev})`);
            prev = slowest[i].elapsedMs;
        }

    } finally {
        globalThis.fetch = originalFetch;
    }
});

QUnit.test("getSlowestQueries strictly limits occurrences to top 5", async function (assert) {
    const service = AdGuardService.getInstance();

    // Create 50 log entries for the SAME domain with descending elapsed times
    const entries: RawLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        answer: [],
        original_answer: [],
        upstream: "1.1.1.1",
        status: "OK",
        question: { type: "A", name: "repeated.com", class: "IN" },
        client: "192.168.1.100",
        time: "2023-01-01T12:00:00Z",
        elapsedMs: String(5000 - i * 10) as unknown as number, // 5000, 4990, 4980...
        reason: "NotFilteredNotFound",
        filterId: 0,
        rule: ""
    }));

    // Add another domain to ensure we have at least 2 items in top list,
    // to trigger the threshold logic which depends on top 10 list analysis
    // But since we only have 1 dominant domain, it will be top 1.
    // Let's add 9 other dummy domains to fill top 10.
    for(let k=0; k<9; k++) {
        entries.push({
            answer: [],
            original_answer: [],
            upstream: "1.1.1.1",
            status: "OK",
            question: { type: "A", name: `other${k}.com`, class: "IN" },
            client: "192.168.1.100",
            time: "2023-01-01T12:00:00Z",
            elapsedMs: "100" as unknown as number, // Fast
            reason: "NotFilteredNotFound",
            filterId: 0,
            rule: ""
        } as RawLogEntry);
    }

    const mockResponse: RawAdGuardData = { data: entries };

    const originalFetch = globalThis.fetch;
    // @ts-expect-error: Mocking fetch for testing purposes
    globalThis.fetch = async () => {
        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(mockResponse)),
            json: async () => Promise.resolve(mockResponse)
        });
    };

    try {
        const slowest = await service.getSlowestQueries(100);

        assert.strictEqual(slowest[0].domain, "repeated.com", "Top domain is repeated.com");

        // With current logic (threshold based on 10th item), the 10th item is 'other8.com' with 100ms.
        // Threshold will be 100ms.
        // So 'repeated.com' will keep ALL 50 occurrences because they are all > 100ms.
        // We Expect optimization to limit it to 5.

        assert.strictEqual(slowest[0].occurrences.length, 5, `Should only have top 5 occurrences, got ${slowest[0].occurrences.length}`);
        assert.strictEqual(slowest[0].occurrences[0], 5000, "Top occurrence is correct");
        assert.strictEqual(slowest[0].occurrences[4], 4960, "5th occurrence is correct");

    } finally {
        globalThis.fetch = originalFetch;
    }
});

QUnit.test("getStats handles mixed key types in top lists", async function (assert) {
    const service = AdGuardService.getInstance();

    const mockResponse = {
        num_dns_queries: 100,
        num_blocked_filtering: 10,
        avg_processing_time: 0.1,
        top_queried_domains: [
            { domain: "domain1.com", count: 10 },
            { name: "domain2.com", count: 5 },
            { "192.168.1.1": 3 } // Legacy/Edge case where key is the name
        ],
        top_blocked_domains: [],
        top_clients: []
    };

    const originalFetch = globalThis.fetch;
    // @ts-expect-error: Mocking fetch for testing purposes
    globalThis.fetch = async () => {
        return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => Promise.resolve(JSON.stringify(mockResponse)),
            json: async () => Promise.resolve(mockResponse)
        });
    };

    try {
        const stats = await service.getStats();
        assert.strictEqual(stats.top_queried_domains.length, 3, "Should return 3 items");
        assert.strictEqual(stats.top_queried_domains[0].name, "domain1.com", "First item domain correct");
        assert.strictEqual(stats.top_queried_domains[1].name, "domain2.com", "Second item name correct");
        assert.strictEqual(stats.top_queried_domains[2].name, "192.168.1.1", "Third item key extraction correct");
    } finally {
        globalThis.fetch = originalFetch;
    }
});
