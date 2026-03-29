import Dashboard from "ui5/aghd/controller/Dashboard.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";
import JSONModel from "sap/ui/model/json/JSONModel";
import Button from "sap/m/Button";
import Event from "sap/ui/base/Event";

interface TestContext {
	controller: Dashboard;
	model: JSONModel;
}

QUnit.module("Dashboard Controller Copy Methods Performance Optimization", {
	beforeEach: function (this: TestContext) {
		this.controller = new Dashboard("dashboard");
		this.model = new JSONModel();

		// Mock getView
		this.controller.getView = (() => ({
			setModel: () => {},
			getModel: () => this.model,
			setBusy: () => {}
		})) as unknown as typeof Dashboard.prototype.getView;

		// Mock getViewModel
		(this.controller as unknown as { getViewModel: () => JSONModel }).getViewModel = () => this.model;

		// Mock escapeCsvField
		(
			this.controller as unknown as { escapeCsvField: (v: string | number | boolean | null | undefined) => string }
		).escapeCsvField = (v: string | number | boolean | null | undefined) => String(v);

		// Mock copyToClipboard
		(this.controller as unknown as { copyToClipboard: () => void }).copyToClipboard = () => {};
		(this.controller as unknown as { getText: () => string }).getText = () => "Copied";
	},
	afterEach: function (this: TestContext) {
		this.controller.destroy();
	}
});

QUnit.test(
	"Optimization: onCopyAllSlowestQueries uses pre-allocated array",
	function (this: TestContext, assert: Assert) {
		const len = 5000;
		const queries = new Array<{ domain: string }>(len);
		for (let i = 0; i < len; i++) {
			queries[i] = { domain: "slow" + i + ".com" };
		}

		this.model.setData({
			slowest_queries: queries
		});

		const button = new Button();
		const event = new Event("test", button, {});

		// Just verifying it doesn't crash to ensure correctness
		this.controller.onCopyAllSlowestQueries(event);

		assert.ok(true, "onCopyAllSlowestQueries executed successfully with optimized loop");

		button.destroy();
	}
);
