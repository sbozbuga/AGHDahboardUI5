import DashboardController from "ui5/aghd/controller/Dashboard.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Dashboard Security");

QUnit.test("escapeCsvField prevents Formula Injection with leading spaces", function (assert) {
    const controller = new DashboardController("dashboard");

    // We access protected method escapeCsvField using known type casting
    const escapeMethod = (controller as unknown as { escapeCsvField(value: string): string }).escapeCsvField.bind(controller);

    const inputs = [
        { val: "=cmd()", expected: "'=cmd()" },
        { val: "  +cmd()", expected: "'  +cmd()" },
        { val: "\t -cmd()", expected: "'\t -cmd()" },
        { val: "@cmd()", expected: "'@cmd()" },
        { val: "safe value", expected: "safe value" },
        { val: "  safe value", expected: "  safe value" },
        { val: "safe=value", expected: "safe=value" }
    ];

    inputs.forEach(input => {
        const result = escapeMethod(input.val);
        assert.strictEqual(result, input.expected, `Input "${input.val}" should be escaped to "${input.expected}"`);
    });
});
