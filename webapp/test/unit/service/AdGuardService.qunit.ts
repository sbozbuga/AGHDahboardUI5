import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import { RawAdGuardStats } from "ui5/aghd/model/AdGuardTypes";

QUnit.module("AdGuardService");

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
    const originalFetch = global.fetch;
    // @ts-expect-error: Mocking fetch for testing purposes
    global.fetch = async () => {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => Promise.resolve(mockResponse)
        });
    };

    try {
        const stats = await service.getStats();
        assert.strictEqual(stats.top_queried_domains.length, 10, "Should return only 10 items");
        assert.strictEqual(stats.top_queried_domains[0].name, "domain0.com", "First item should be correct");

    } finally {
        global.fetch = originalFetch;
    }
});
