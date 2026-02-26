import LogsController from "ui5/aghd/controller/Logs.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";
import Table from "sap/m/Table";
import ListBinding from "sap/ui/model/ListBinding";
import { Constants } from "ui5/aghd/model/Constants";
import View from "sap/ui/core/mvc/View";

interface TestContext {
    controller: LogsController;
    model: JSONModel;
    refreshSpy: { called: boolean; calledWithAppend: boolean; callCount: number };
    originalRefresh: (bAppend?: boolean) => Promise<void>;
    mockTable: Table;
    mockBinding: ListBinding;
}

QUnit.module("Logs Controller Optimization", {
    beforeEach: function (this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller = new LogsController("logs");
        ctx.model = new JSONModel({
            [Constants.ModelProperties.Limit]: 1000,
            [Constants.ModelProperties.Offset]: 0,
            [Constants.ModelProperties.FilterStatus]: "",
            [Constants.ModelProperties.Data]: []
        });

        // Mock View
        ctx.controller.getView = (() => ({
            setModel: () => { },
            getModel: () => ctx.model,
            setBusy: () => { },
            byId: () => null
        })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        // Mock Table and Binding
        ctx.mockBinding = {
            filter: () => { },
            sort: () => { }
        } as unknown as ListBinding;

        ctx.mockTable = new Table();
        ctx.mockTable.getBinding = () => ctx.mockBinding;

        // Spy on onRefreshLogs
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ctx.originalRefresh = ctx.controller.onRefreshLogs;
        ctx.refreshSpy = { called: false, calledWithAppend: false, callCount: 0 };
        ctx.controller.onRefreshLogs = async (bAppend?: boolean) => {
            ctx.refreshSpy.called = true;
            ctx.refreshSpy.calledWithAppend = !!bAppend;
            ctx.refreshSpy.callCount++;
            return Promise.resolve();
        };
    },
    afterEach: function (this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller.destroy();
        ctx.mockTable.destroy();
    }
});

QUnit.test("onUpdateFinished: Should NOT fetch when growing but data still available in model", function (this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    // Arrange
    // reason=Growing, actual=40, total=100.
    // actual < total => Should NOT fetch.
    const event = new Event("updateFinished", ctx.mockTable, {
        reason: "Growing",
        actual: 40,
        total: 100
    });

    // Act
    ctx.controller.onUpdateFinished(event);

    // Assert
    assert.strictEqual(ctx.refreshSpy.called, false, "onRefreshLogs should NOT be called when actual < total");
});

QUnit.test("onUpdateFinished: Should fetch when growing and end of data reached", function (this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    // Arrange
    // reason=Growing, actual=100, total=100.
    // actual >= total => Should fetch.
    const event = new Event("updateFinished", ctx.mockTable, {
        reason: "Growing",
        actual: 100,
        total: 100
    });

    // Act
    ctx.controller.onUpdateFinished(event);

    // Assert
    assert.strictEqual(ctx.refreshSpy.called, true, "onRefreshLogs called");
    assert.strictEqual(ctx.refreshSpy.calledWithAppend, true, "onRefreshLogs called with bAppend=true");
});
