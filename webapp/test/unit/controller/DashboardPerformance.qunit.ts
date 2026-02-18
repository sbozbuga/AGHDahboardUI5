import Dashboard from "ui5/aghd/controller/Dashboard.controller";
import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import JSONModel from "sap/ui/model/json/JSONModel";

interface TestContext {
    controller: Dashboard;
    model: JSONModel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockService: any;
    originalGetInstance: () => AdGuardService;
}

QUnit.module("Dashboard Controller Performance Optimization", {
    beforeEach: function(this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller = new Dashboard("dashboard");
        ctx.model = new JSONModel();

        // Mock getView
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ctx.controller.getView = (() => ({
            setModel: () => {},
            getModel: () => ctx.model,
            setBusy: () => {}
        })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        // Mock AdGuardService
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ctx.originalGetInstance = AdGuardService.getInstance;

        ctx.mockService = {
            getStats: () => Promise.resolve({ num_dns_queries: 100 }),
            getQueryLog: () => Promise.resolve({ data: [{ time: new Date("2023-01-01T12:00:00") }] }),
            getSlowestQueries: () => Promise.resolve([{ domain: "slow.com", elapsedMs: 500 }])
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        AdGuardService.getInstance = () => ctx.mockService;
    },
    afterEach: function(this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller.destroy();
        AdGuardService.getInstance = ctx.originalGetInstance;
    }
});

QUnit.test("Optimization: getSlowestQueries is throttled to 60s", async function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    let callCount = 0;

    // Mock Date.now
    const originalDateNow = Date.now;
    let currentTime = 1000000;
    Date.now = () => currentTime;

    try {
        // Spy on getSlowestQueries
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ctx.mockService.getSlowestQueries = () => {
            callCount++;
            return Promise.resolve([]);
        };

        // 1. First run (T=0) -> Should Fetch
        await ctx.controller.onRefreshStats(true);
        assert.strictEqual(callCount, 1, "First run calls getSlowestQueries");

        // 2. Second run (T=15s) with new data -> Should Skip (Throttled)
        currentTime += 15000;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ctx.mockService.getQueryLog = () => Promise.resolve({ data: [{ time: new Date("2023-01-01T12:00:15") }] });
        await ctx.controller.onRefreshStats(true);
        assert.strictEqual(callCount, 1, "Second run (15s elapsed) skips getSlowestQueries due to throttling");

        // 3. Third run (T=30s) with new data -> Should Skip
        currentTime += 15000;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ctx.mockService.getQueryLog = () => Promise.resolve({ data: [{ time: new Date("2023-01-01T12:00:30") }] });
        await ctx.controller.onRefreshStats(true);
        assert.strictEqual(callCount, 1, "Third run (30s elapsed) skips getSlowestQueries");

        // 4. Fourth run (T=65s) -> Should Fetch
        currentTime += 35000; // Total +65s from start
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ctx.mockService.getQueryLog = () => Promise.resolve({ data: [{ time: new Date("2023-01-01T12:01:05") }] });
        await ctx.controller.onRefreshStats(true);
        assert.strictEqual(callCount, 2, "Fourth run (65s elapsed) calls getSlowestQueries");

    } finally {
        Date.now = originalDateNow;
    }
});
