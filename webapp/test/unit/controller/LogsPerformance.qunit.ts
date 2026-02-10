/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import LogsController from "ui5/aghd/controller/Logs.controller";
import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import JSONModel from "sap/ui/model/json/JSONModel";
import { Constants } from "ui5/aghd/model/Constants";

interface TestContext {
    controller: LogsController;
    model: JSONModel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockService: any;
    originalGetInstance: () => AdGuardService;
}

QUnit.module("Logs Controller Performance Optimization", {
    beforeEach: function(this: TestContext) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        ctx.controller = new LogsController("logs");
        ctx.model = new JSONModel({
            [Constants.ModelProperties.Limit]: 1000,
            [Constants.ModelProperties.Offset]: 0,
            [Constants.ModelProperties.FilterStatus]: "",
            [Constants.ModelProperties.Data]: []
        });

        // Mock getView
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ctx.controller.getView = (() => ({
            setModel: () => {},
            getModel: () => ctx.model,
            setBusy: () => {},
            byId: () => null // searchField, logsTable
        })) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        // Mock AdGuardService
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ctx.originalGetInstance = AdGuardService.getInstance;

        // Default Mock Data
        ctx.mockService = {
            getQueryLog: () => Promise.resolve({
                data: [
                    { time: "2023-01-01T12:00:00Z", elapsedMs: "10.5", question: { name: "test1.com" } },
                    { time: "2023-01-01T12:00:01Z", elapsedMs: "20.0", question: { name: "test2.com" } }
                ]
            })
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

QUnit.test("onRefreshLogs (Initial Load): Transforms data correctly without allocation overhead", async function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    // Act: Initial load (bAppend = false)
    await ctx.controller.onRefreshLogs(false);

    // Assert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = ctx.model.getProperty(Constants.ModelProperties.Data) as any[];

    assert.strictEqual(data.length, 2, "Data length should match API response");

    // Check transformation
    assert.ok(data[0].time instanceof Date, "Time string converted to Date object");
    assert.strictEqual(data[0].time.toISOString(), "2023-01-01T12:00:00.000Z", "Date value is correct");
    assert.strictEqual(typeof data[0].elapsedMs, "number", "ElapsedMs string converted to number");
    assert.strictEqual(data[0].elapsedMs, 10.5, "ElapsedMs value is correct");

    // Check second item
    assert.strictEqual(data[1].question.name, "test2.com", "Second item data preserved");
});

QUnit.test("onRefreshLogs (Append): Appends data correctly using optimized push", async function(this: TestContext, assert: Assert) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ctx = this;

    // Arrange: Set initial data
    const initialData = [{ id: "existing" }];
    ctx.model.setProperty(Constants.ModelProperties.Data, initialData);

    // Act: Append (bAppend = true)
    await ctx.controller.onRefreshLogs(true);

    // Assert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = ctx.model.getProperty(Constants.ModelProperties.Data) as any[];

    assert.strictEqual(data.length, 3, "Data length should be existing + new (1 + 2)");
    assert.strictEqual(data[0].id, "existing", "Existing data preserved at start");

    // Check appended data
    assert.ok(data[1].time instanceof Date, "Appended item 1 transformed");
    assert.strictEqual(data[1].question.name, "test1.com", "Appended item 1 correct");

    assert.ok(data[2].time instanceof Date, "Appended item 2 transformed");
    assert.strictEqual(data[2].question.name, "test2.com", "Appended item 2 correct");
});
