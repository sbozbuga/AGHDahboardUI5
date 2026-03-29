import FilteringService from "ui5/aghd/service/FilteringService";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Filtering Service Tests", {
	beforeEach: function () {
		FilteringService.getInstance().clearCache();
	}
});

QUnit.test("getFilters fetches and caches filters", async function (assert) {
	const service = FilteringService.getInstance();
	const mockFilters = [
		{ id: 1, name: "Filter 1", enabled: true, url: "http://example.com/1", rulesCount: 100 },
		{ id: 2, name: "Filter 2", enabled: false, url: "http://example.com/2", rulesCount: 200 }
	];

	// Mock fetch
	const originalFetch = globalThis.fetch;
	// @ts-expect-error - Mocking fetch
	globalThis.fetch = async () => {
		return Promise.resolve({
			ok: true,
			status: 200,
			text: async () => Promise.resolve(JSON.stringify({ filters: mockFilters })),
			json: async () => Promise.resolve({ filters: mockFilters })
		});
	};

	try {
		const filters = await service.getFilters();
		assert.strictEqual(filters.length, 2, "Should return 2 filters");
		assert.strictEqual(filters[0].name, "Filter 1", "First filter name correct");

		const name = await service.getFilterName(2);
		assert.strictEqual(name, "Filter 2", "Should return Filter 2 for ID 2");

		const syncName = service.getFilterNameSync(1);
		assert.strictEqual(syncName, "Filter 1", "Synchronous name resolution correct");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

QUnit.test("getFilterName fallback", async function (assert) {
	const service = FilteringService.getInstance();

	// Mock fetch with empty list
	const originalFetch = globalThis.fetch;
	// @ts-expect-error - Mocking fetch
	globalThis.fetch = async () => {
		return Promise.resolve({
			ok: true,
			status: 200,
			json: async () => Promise.resolve({ filters: [] })
		});
	};

	try {
		const name = await service.getFilterName(999);
		assert.strictEqual(name, "Filter 999", "Should return fallback name for missing filter");
	} finally {
		globalThis.fetch = originalFetch;
	}
});
