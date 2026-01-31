import Dashboard from "ui5/aghd/controller/Dashboard.controller";
import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import JSONModel from "sap/ui/model/json/JSONModel";

interface TestContext {
    controller: Dashboard;
    originalSetInterval: typeof window.setInterval;
    originalClearInterval: typeof window.clearInterval;
    intervalCalls: number;
    clearCalls: number;
    lastIntervalId: number;
    originalAddEventListener: typeof document.addEventListener;
    originalRemoveEventListener: typeof document.removeEventListener;
    eventListeners: Record<string, EventListenerOrEventListenerObject>;
    originalHiddenDescriptor: PropertyDescriptor | undefined;
    model: JSONModel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockService: any;
    originalGetInstance: () => AdGuardService;
}

QUnit.module("Dashboard Controller Performance");

QUnit.test("Refresh Interval should be optimized", function (assert) {
    // @ts-expect-error: Accessing private static property for testing
    const interval = Dashboard.REFRESH_INTERVAL;

    // Optimization check: increased to 15000ms
    assert.strictEqual(interval, 15000, "Refresh interval is optimized to 15000ms");
});

QUnit.module("Dashboard Polling Logic", {
    beforeEach: function() {
        const ctx = this as unknown as TestContext;
        ctx.controller = new Dashboard("dashboard");

        // Mock getView
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ctx.controller.getView = (() => ({
            setModel: () => {},
            getModel: () => new JSONModel(),
            setBusy: () => {}
        })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        // Mock onRefreshStats to avoid side effects
        ctx.controller.onRefreshStats = () => Promise.resolve();

        // Spy on setInterval/clearInterval
        ctx.originalSetInterval = window.setInterval;
        ctx.originalClearInterval = window.clearInterval;
        ctx.intervalCalls = 0;
        ctx.clearCalls = 0;
        ctx.lastIntervalId = 123;

        window.setInterval = (() => {
            ctx.intervalCalls++;
            return ctx.lastIntervalId;
        }) as unknown as typeof window.setInterval;

        window.clearInterval = (() => {
            ctx.clearCalls++;
        }) as unknown as typeof window.clearInterval;
        window.setInterval = ((() => {
            ctx.intervalCalls++;
            return ctx.lastIntervalId;
        }) as unknown as typeof window.setInterval);

        window.clearInterval = ((() => {
            ctx.clearCalls++;
        }) as unknown as typeof window.clearInterval);

        // Spy on document.addEventListener
        ctx.originalAddEventListener = document.addEventListener.bind(document);
        ctx.originalRemoveEventListener = document.removeEventListener.bind(document);
        ctx.eventListeners = {};

        document.addEventListener = (event: string, handler: EventListenerOrEventListenerObject) => {
            ctx.eventListeners[event] = handler;
        };
        document.removeEventListener = (event: string, handler: EventListenerOrEventListenerObject) => {
             if (ctx.eventListeners[event] === handler) {
                 delete ctx.eventListeners[event];
             }
        };

        // Save original hidden property descriptor
        ctx.originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    },
    afterEach: function() {
        const ctx = this as unknown as TestContext;
        ctx.controller.destroy();
        window.setInterval = ctx.originalSetInterval;
        window.clearInterval = ctx.originalClearInterval;
        document.addEventListener = ctx.originalAddEventListener;
        document.removeEventListener = ctx.originalRemoveEventListener;

        // Restore hidden property
        if (ctx.originalHiddenDescriptor) {
            Object.defineProperty(Document.prototype, 'hidden', ctx.originalHiddenDescriptor);
        }
    }
});

QUnit.test("onInit starts polling and registers visibility listener", function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    ctx.controller.onInit();

    assert.strictEqual(ctx.intervalCalls, 1, "Polling started (setInterval called)");
    assert.ok(ctx.eventListeners["visibilitychange"], "Visibility listener registered");
});

QUnit.test("onExit stops polling and removes visibility listener", function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    ctx.controller.onInit();
    // Reset counters
    ctx.intervalCalls = 0;
    ctx.clearCalls = 0;

    ctx.controller.onExit();

    assert.strictEqual(ctx.clearCalls, 1, "Polling stopped (clearInterval called)");
    assert.notOk(ctx.eventListeners["visibilitychange"], "Visibility listener removed");
});

QUnit.test("onVisibilityChange pauses polling when hidden", function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    ctx.controller.onInit();
    ctx.clearCalls = 0;
    ctx.intervalCalls = 0;

    // Simulate hidden
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => true });

    // Call the handler
    // @ts-expect-error: Accessing private member for testing
    ctx.controller.onVisibilityChange();

    assert.strictEqual(ctx.clearCalls, 1, "Polling stopped when hidden");

    // Simulate visible
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => false });

    // Call the handler
    // @ts-expect-error: Accessing private member for testing
    ctx.controller.onVisibilityChange();

    assert.strictEqual(ctx.intervalCalls, 1, "Polling restarted when visible");
});

QUnit.module("Dashboard Data Fetching", {
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
            getQueryLog: () => Promise.resolve({ data: [{ time: "2023-01-01T12:00:00" }] }),
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

QUnit.test("onRefreshStats fetches slowest queries on first run", async function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    let called = false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.mockService.getSlowestQueries = () => {
        called = true;
        return Promise.resolve([]);
    };

    await ctx.controller.onRefreshStats(true);
    assert.ok(called, "getSlowestQueries called on first run");
});

QUnit.test("onRefreshStats skips slowest queries if logs unchanged", async function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    // First run
    await ctx.controller.onRefreshStats(true);

    // Reset spy
    let called = false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.mockService.getSlowestQueries = () => {
        called = true;
        return Promise.resolve([]);
    };

    // Second run - same log time
    await ctx.controller.onRefreshStats(true);
    assert.notOk(called, "getSlowestQueries skipped when log time matches");
});

QUnit.test("onRefreshStats fetches slowest queries if logs changed", async function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    // First run
    await ctx.controller.onRefreshStats(true);

    // Change log time
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.mockService.getQueryLog = () => Promise.resolve({ data: [{ time: "2023-01-01T12:00:01" }] });

    // Spy
    let called = false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.mockService.getSlowestQueries = () => {
        called = true;
        return Promise.resolve([]);
    };

    // Second run
    await ctx.controller.onRefreshStats(true);
    assert.ok(called, "getSlowestQueries called when log time changed");
});
