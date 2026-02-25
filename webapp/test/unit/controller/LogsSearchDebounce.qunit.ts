import LogsController from "ui5/aghd/controller/Logs.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";
import Event from "sap/ui/base/Event";
import SearchField from "sap/m/SearchField";
import View from "sap/ui/core/mvc/View";
import JSONModel from "sap/ui/model/json/JSONModel";
import ListBinding from "sap/ui/model/ListBinding";
import Table from "sap/m/Table";

interface TestContext {
    controller: LogsController;
    applyFiltersSpy: { callCount: 0 };
    model: JSONModel;
    mockTable: Table;
    mockBinding: ListBinding;
}

QUnit.module("Logs Controller Search Debounce", {
    beforeEach: function(this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller = new LogsController("logs");

        ctx.model = new JSONModel({
            data: []
        });

        // Mock View
        ctx.controller.getView = (() => ({
            setModel: () => {},
            getModel: () => ctx.model,
            setBusy: () => {},
            byId: () => null
        })) as unknown as View;

        // Mock Table and Binding
        ctx.mockBinding = {
            filter: () => {},
            sort: () => {}
        } as unknown as ListBinding;

        ctx.mockTable = new Table();
        ctx.mockTable.getBinding = () => ctx.mockBinding;

        // Spy on _applyFilters
        ctx.applyFiltersSpy = { callCount: 0 };
        (ctx.controller as unknown as { _applyFilters: () => void })._applyFilters = () => {
            ctx.applyFiltersSpy.callCount++;
        };
    },
    afterEach: function(this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller.destroy();
        ctx.mockTable.destroy();
    }
});

QUnit.test("onSearch: Should debounce liveChange events", function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;
    const done = assert.async();

    // Simulate 5 rapid liveChange events
    for (let i = 0; i < 5; i++) {
        const mockSearchField = new SearchField();
        mockSearchField.setValue("test" + i);
        const event = new Event("liveChange", mockSearchField, {});
        ctx.controller.onSearch(event);
    }

    // Immediately after calls, count should be 0 (timer pending)
    assert.strictEqual(ctx.applyFiltersSpy.callCount, 0, "No filter applied immediately");

    // Wait for debounce (300ms + buffer)
    setTimeout(() => {
        assert.strictEqual(ctx.applyFiltersSpy.callCount, 1, "Filter applied exactly once after debounce");
        done();
    }, 400);
});

QUnit.test("onSearch: Should NOT debounce search (Enter) events", function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    const mockSearchField = new SearchField();
    mockSearchField.setValue("immediate");

    const event = new Event("search", mockSearchField, {});

    ctx.controller.onSearch(event);

    assert.strictEqual(ctx.applyFiltersSpy.callCount, 1, "Filter applied immediately for 'search' event");
});
