import FilterHelper from "ui5/aghd/model/FilterHelper";
import QUnit from "sap/ui/thirdparty/qunit-2";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import { Constants } from "ui5/aghd/model/Constants";
import type { AdvancedFilterRule } from "ui5/aghd/model/AdGuardTypes";

interface TestFilter {
	bAnd: boolean;
	aFilters?: Filter[];
	aSyntheticFilters?: Filter[];
}

QUnit.module("FilterHelper - getSearchFilter");

QUnit.test("Should return null for empty or whitespace query", function (assert) {
	assert.strictEqual(FilterHelper.getSearchFilter(""), null, "Empty string returns null");
	assert.strictEqual(FilterHelper.getSearchFilter("   "), null, "Whitespace returns null");
	assert.strictEqual(FilterHelper.getSearchFilter(null as unknown as string), null, "Null returns null");
});

QUnit.test("Should create ORed filter for domain and client", function (assert) {
	const filter = FilterHelper.getSearchFilter("test-query");
	assert.ok(filter instanceof Filter, "Returns a Filter object");
	const fObj = filter as unknown as TestFilter;
	assert.strictEqual(fObj.bAnd, false, "Filters are ORed (and = false)");
	const subFilters = fObj.aSyntheticFilters || fObj.aFilters || [];
	assert.strictEqual(subFilters.length, 2, "Has 2 sub-filters");

	const f1 = subFilters[0];
	const f2 = subFilters[1];
	assert.strictEqual(f1.getPath(), Constants.ColumnIds.QuestionName, "First filter path is question/name");
	assert.strictEqual(f1.getOperator(), FilterOperator.Contains, "First operator is Contains");
	assert.strictEqual(f1.getValue1(), "test-query", "First value matches search query");

	assert.strictEqual(f2.getPath(), Constants.ColumnIds.Client, "Second filter path is client");
	assert.strictEqual(f2.getOperator(), FilterOperator.Contains, "Second operator is Contains");
	assert.strictEqual(f2.getValue1(), "test-query", "Second value matches search query");
});

QUnit.module("FilterHelper - getViewSettingsFilter");

QUnit.test("Should return null for empty filters array", function (assert) {
	assert.strictEqual(FilterHelper.getViewSettingsFilter([]), null, "Empty array returns null");
	assert.strictEqual(FilterHelper.getViewSettingsFilter(null as unknown as Filter[]), null, "Null returns null");
});

QUnit.test("Should OR view settings filters together", function (assert) {
	const f1 = new Filter("status", FilterOperator.EQ, "OK");
	const f2 = new Filter("status", FilterOperator.EQ, "Blocked");

	const filter = FilterHelper.getViewSettingsFilter([f1, f2]);
	const fObj = filter as unknown as TestFilter;
	assert.strictEqual(fObj.bAnd, false, "Should OR view settings filters (bAnd = false)");
	const subFilters = fObj.aSyntheticFilters || fObj.aFilters || [];
	assert.strictEqual(subFilters.length, 2, "Contains both filters");
	assert.strictEqual(subFilters[0], f1, "First filter matches");
	assert.strictEqual(subFilters[1], f2, "Second filter matches");
});

QUnit.module("FilterHelper - getAdvancedFilters");

QUnit.test("Should return empty array for empty advanced rules", function (assert) {
	assert.deepEqual(FilterHelper.getAdvancedFilters([]), [], "Empty array returns empty array");
	assert.deepEqual(
		FilterHelper.getAdvancedFilters(null as unknown as AdvancedFilterRule[]),
		[],
		"Null returns empty array"
	);
});

QUnit.test("Should construct and cast advanced filters correctly", function (assert) {
	const rules: AdvancedFilterRule[] = [
		{ column: "question/name", operator: "Contains", value: "google" },
		{ column: "elapsedMs", operator: "GT", value: "250.5" },
		{ column: "blocked", operator: "EQ", value: "true" },
		{ column: "filterId", operator: "EQ", value: "15" },
		{ column: "rule", operator: "StartsWith", value: "||" },
		{ column: "status", operator: "EQ", value: "" } // Should be ignored
	];

	const filters = FilterHelper.getAdvancedFilters(rules);
	assert.strictEqual(filters.length, 5, "Constructs 5 valid filters, ignoring the empty value rule");

	assert.strictEqual(filters[0].getPath(), "question/name", "Rule 1 path");
	assert.strictEqual(filters[0].getValue1(), "google", "Rule 1 value (string)");

	assert.strictEqual(filters[1].getPath(), "elapsedMs", "Rule 2 path");
	assert.strictEqual(filters[1].getValue1(), 250.5, "Rule 2 value (parsed float)");

	assert.strictEqual(filters[2].getPath(), "blocked", "Rule 3 path");
	assert.strictEqual(filters[2].getValue1(), true, "Rule 3 value (parsed boolean)");

	assert.strictEqual(filters[3].getPath(), "filterId", "Rule 4 path");
	assert.strictEqual(filters[3].getValue1(), 15, "Rule 4 value (parsed int)");

	assert.strictEqual(filters[4].getPath(), "rule", "Rule 5 path");
	assert.strictEqual(filters[4].getValue1(), "||", "Rule 5 value");
});
