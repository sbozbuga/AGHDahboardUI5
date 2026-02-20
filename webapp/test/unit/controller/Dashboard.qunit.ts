import Dashboard from "ui5/aghd/controller/Dashboard.controller";
import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";

interface TestContext {
    controller: Dashboard;
    originalSetTimeout: typeof window.setTimeout;
    originalClearTimeout: typeof window.clearTimeout;
    timeoutCalls: number;
    clearTimeoutCalls: number;
    lastTimeoutId: number;
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
        const model = new JSONModel();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ctx.controller.getView = (() => ({
            setModel: () => {},
            getModel: () => model,
            setBusy: () => {}
        })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        ctx.model = model;

        // Mock onRefreshStats to avoid side effects (will be restored/mocked differently in tests)
        // Actually, we want to test onRefreshStats logic in some tests, but here we test polling.
        ctx.controller.onRefreshStats = () => Promise.resolve();

        // Spy on setTimeout/clearTimeout
        ctx.originalSetTimeout = window.setTimeout;
        ctx.originalClearTimeout = window.clearTimeout;
        ctx.timeoutCalls = 0;
        ctx.clearTimeoutCalls = 0;
        ctx.lastTimeoutId = 123;

        window.setTimeout = ((() => {
            ctx.timeoutCalls++;
            return ctx.lastTimeoutId;
        }) as unknown as typeof window.setTimeout);

        window.clearTimeout = ((() => {
            ctx.clearTimeoutCalls++;
        }) as unknown as typeof window.clearTimeout);

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
        window.setTimeout = ctx.originalSetTimeout;
        window.clearTimeout = ctx.originalClearTimeout;
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

    assert.strictEqual(ctx.timeoutCalls, 1, "Polling started (setTimeout called)");
    assert.ok(ctx.eventListeners["visibilitychange"], "Visibility listener registered");
});

QUnit.test("onExit stops polling and removes visibility listener", function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    ctx.controller.onInit();
    // Reset counters
    ctx.timeoutCalls = 0;
    ctx.clearTimeoutCalls = 0;

    ctx.controller.onExit();

    assert.strictEqual(ctx.clearTimeoutCalls, 1, "Polling stopped (clearTimeout called)");
    assert.notOk(ctx.eventListeners["visibilitychange"], "Visibility listener removed");
});

QUnit.test("onVisibilityChange pauses polling when hidden", function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    ctx.controller.onInit();
    ctx.clearTimeoutCalls = 0;
    ctx.timeoutCalls = 0;

    // Simulate hidden
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => true });

    // Call the handler
    // @ts-expect-error: Accessing private member for testing
    ctx.controller.onVisibilityChange();

    assert.strictEqual(ctx.clearTimeoutCalls, 1, "Polling stopped when hidden");

    // Simulate visible
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => false });

    // Call the handler
    // @ts-expect-error: Accessing private member for testing
    ctx.controller.onVisibilityChange();

    assert.strictEqual(ctx.timeoutCalls, 1, "Polling restarted when visible");
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
            getQueryLog: () => Promise.resolve({ data: [{ time: new Date("2023-01-01T12:00:00") }] }), // Date object
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
    const originalDateNow = Date.now;
    let currentTime = 1000000;
    Date.now = () => currentTime;

    try {
        // First run
        await ctx.controller.onRefreshStats(true);

        // Change log time
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ctx.mockService.getQueryLog = () => Promise.resolve({ data: [{ time: new Date("2023-01-01T12:00:01") }] });

        // Spy
        let called = false;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ctx.mockService.getSlowestQueries = () => {
            called = true;
            return Promise.resolve([]);
        };

        // Advance time to bypass throttle
        currentTime += 61000;

        // Second run
        await ctx.controller.onRefreshStats(true);
        assert.ok(called, "getSlowestQueries called when log time changed");
    } finally {
        Date.now = originalDateNow;
    }
});

QUnit.test("onRefreshStats updates lastUpdated property", async function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    const model = ctx.model; // Use the mocked model directly

    // Initial state
    assert.notOk(model.getProperty("/lastUpdated"), "lastUpdated is initially undefined");

    await ctx.controller.onRefreshStats(true);

    assert.ok(model.getProperty("/lastUpdated") instanceof Date, "lastUpdated is set to a Date object");
});

QUnit.module("Dashboard Logout Logic", {
    beforeEach: function (this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller = new Dashboard("dashboard");

        // Mock AdGuardService
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ctx.originalGetInstance = AdGuardService.getInstance;

        ctx.mockService = {
            logout: () => {}
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        AdGuardService.getInstance = () => ctx.mockService;
    },
    afterEach: function (this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller.destroy();
        AdGuardService.getInstance = ctx.originalGetInstance;
    }
});

QUnit.test("onLogoutPress asks for confirmation", function (this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    // Spy on MessageBox.confirm
    let confirmCalled = false;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalConfirm = MessageBox.confirm;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MessageBox.confirm = (message: string, options: any) => {
        confirmCalled = true;
        // Since i18n is not loaded, we get key "logoutConfirmation"
        assert.ok(message.includes("logoutConfirmation") || message.includes("Are you sure"), "Confirmation message shown (key or text)");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        assert.ok(options.actions.includes(MessageBox.Action.OK), "OK action available");

        // Simulate clicking OK
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (options.onClose) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            options.onClose(MessageBox.Action.OK);
        }
    };

    // Spy on service logout
    let logoutCalled = false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.mockService.logout = () => {
        logoutCalled = true;
    };

    try {
        ctx.controller.onLogoutPress();
        assert.ok(confirmCalled, "MessageBox.confirm was called");
        assert.ok(logoutCalled, "AdGuardService.logout was called after confirmation");
    } finally {
        // Restore
        MessageBox.confirm = originalConfirm;
    }
});
