import DashboardController from "ui5/aghd/controller/Dashboard.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Dashboard Security");

QUnit.test("escapeCsvField prevents Formula Injection with leading spaces", function (assert) {
	const controller = new DashboardController("dashboard");

	// We access protected method escapeCsvField using known type casting
	const escapeMethod = (controller as unknown as { escapeCsvField(value: unknown): string }).escapeCsvField.bind(
		controller
	);

	const inputs = [
		{ val: "=cmd()", expected: "'=cmd()" },
		{ val: "  +cmd()", expected: "'  +cmd()" },
		{ val: "\t -cmd()", expected: "'\t -cmd()" },
		{ val: "@cmd()", expected: "'@cmd()" },
		{ val: "safe value", expected: "safe value" },
		{ val: "  safe value", expected: "  safe value" },
		{ val: "safe=value", expected: "safe=value" }
	];

	inputs.forEach((input) => {
		const result = escapeMethod(input.val);
		assert.strictEqual(result, input.expected, `Input "${input.val}" should be escaped to "${input.expected}"`);
	});
});

QUnit.test("escapeCsvField edge cases - null, undefined, empty, non-string types", function (assert) {
	const controller = new DashboardController("dashboard");
	const escapeMethod = (controller as unknown as { escapeCsvField(value: unknown): string }).escapeCsvField.bind(
		controller
	);

	// 1. Null and Undefined
	assert.strictEqual(escapeMethod(null), "", "Null should return empty string");
	assert.strictEqual(escapeMethod(undefined), "", "Undefined should return empty string");

	// 2. Empty String
	assert.strictEqual(escapeMethod(""), "", "Empty string should return empty string");

	// 3. Numbers
	assert.strictEqual(escapeMethod(0), "0", "Number 0 should return '0'");
	assert.strictEqual(escapeMethod(123), "123", "Positive number should return '123'");
	assert.strictEqual(escapeMethod(-456), "'-456", "Negative number should be escaped to prevent formula injection");

	// 4. Booleans
	assert.strictEqual(escapeMethod(true), "true", "Boolean true should return 'true'");
	assert.strictEqual(escapeMethod(false), "false", "Boolean false should return 'false'");
});

QUnit.test("escapeCsvField edge cases - special characters requiring quoting", function (assert) {
	const controller = new DashboardController("dashboard");
	const escapeMethod = (controller as unknown as { escapeCsvField(value: unknown): string }).escapeCsvField.bind(
		controller
	);

	// 1. Commas
	assert.strictEqual(
		escapeMethod("value,with,commas"),
		'"value,with,commas"',
		"Fields with commas must be double quoted"
	);

	// 2. Quotes
	assert.strictEqual(
		escapeMethod('value"with"quotes'),
		'"value""with""quotes"',
		"Double quotes in fields must be escaped as two double quotes and wrapped in double quotes"
	);

	// 3. Newlines and carriage returns
	assert.strictEqual(
		escapeMethod("value\nwith\nnewlines"),
		'"value\nwith\nnewlines"',
		"Fields with newlines must be double quoted"
	);
	assert.strictEqual(
		escapeMethod("value\rwith\rreturns"),
		'"value\rwith\rreturns"',
		"Fields with carriage returns must be double quoted"
	);
});

QUnit.test("escapeCsvField edge cases - combined quoting and formula injection", function (assert) {
	const controller = new DashboardController("dashboard");
	const escapeMethod = (controller as unknown as { escapeCsvField(value: unknown): string }).escapeCsvField.bind(
		controller
	);

	// 1. Negative number with commas
	assert.strictEqual(
		escapeMethod("-1,234.56"),
		'"\'-1,234.56"',
		"Negative number with commas must be formula escaped and double quoted"
	);

	// 2. Formula injection with double quotes
	assert.strictEqual(
		escapeMethod('=val"with"quotes'),
		'"\'=val""with""quotes"',
		"Formula injection with double quotes must be prepended with single quote, double quotes escaped, and double quoted overall"
	);

	// 3. Leading space formula injection with newline
	assert.strictEqual(
		escapeMethod(" =val\nwith\nnewline"),
		'"\' =val\nwith\nnewline"',
		"Leading space formula injection with newline must be properly escaped and quoted"
	);
});
