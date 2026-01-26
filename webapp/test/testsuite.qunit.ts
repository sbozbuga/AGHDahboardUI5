import type { SuiteConfiguration } from "sap/ui/test/starter/config"; // Available since UI5 1.142

export default {
	name: "Testsuite for the UI5 AGH Dashboard app",
	defaults: {
		page: "ui5://test-resources/ui5/aghd/Test.qunit.html?testsuite={suite}&test={name}",
		qunit: {
			version: 2
		},
		sinon: {
			version: 4
		},
		ui5: {
			theme: "sap_horizon"
		},
		loader: {
			paths: {
				"ui5/aghd": "../",
				"integration": "./integration",
				"unit": "./unit"
			}
		}
	},
	tests: {
		"unit/unitTests": {
			title: "QUnit test suite for the UI5 AGH Dashboard app"
		},
		"integration/opaTests": {
			title: "Integration tests for the UI5 AGH Dashboard app"
		},
	}
} satisfies SuiteConfiguration;
