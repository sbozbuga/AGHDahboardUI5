import StatsService from "ui5/aghd/service/StatsService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import { RawAdGuardData, RawLogEntry } from "ui5/aghd/model/AdGuardTypes";

QUnit.module("StatsService Aggregation Benchmark", {
	beforeEach: function () {
		StatsService.getInstance().clearCache();
	},
	afterEach: function () {
		StatsService.getInstance().clearCache();
	}
});

QUnit.test("getStats aggregation performance", async function (assert) {
	const service = StatsService.getInstance();
	const count = 5000;
	const uniqueDomains = 2000; // High cardinality to stress allocation

	const entries: RawLogEntry[] = Array.from({ length: count }, (_, i) => {
		const domainIndex = i % uniqueDomains;
		return {
			answer: [],
			original_answer: [],
			upstream: "1.1.1.1",
			status: "OK",
			question: { type: "A", name: `domain${domainIndex}.com`, class: "IN" },
			client: `192.168.1.${i % 255}`,
			time: new Date(Date.now() - i * 1000).toISOString(),
			elapsedMs: 10,
			reason: i % 5 === 0 ? "Filtered" : "NotFiltered",
			filterId: i % 5 === 0 ? (i % 10) + 1 : 0,
			rule: ""
		};
	});

	const mockResponse: RawAdGuardData = { data: entries };

	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => {
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
		// "24h" period will trigger _getStatsFromLogs
		await service.getStats("24h");
		const end = performance.now();
		const duration = end - start;

		console.log(`BENCHMARK_AGGREGATION: Processed ${count} entries in ${duration.toFixed(4)}ms`);
		assert.ok(true, `Benchmark completed in ${duration.toFixed(4)}ms`);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
