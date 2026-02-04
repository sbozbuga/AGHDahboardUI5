import Opa5 from "sap/ui/test/Opa5";

export default class AppPage extends Opa5 {

	// Actions
	// Add custom actions here

	// Assertions
	iShouldSeeTheApp() {
		return this.waitFor({
			controlType: "sap.m.Page",
			matchers: {
				properties: {
					title: "AdGuard Home Dashboard"
				}
			},
			success: function () {
				Opa5.assert.ok(true, "The Dashboard view is displayed");
			},
			errorMessage: "Did not find the Dashboard page"
		});
	}

}
