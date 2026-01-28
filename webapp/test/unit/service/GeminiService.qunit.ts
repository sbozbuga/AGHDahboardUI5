import GeminiService from "ui5/aghd/service/GeminiService";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Gemini Service");

QUnit.test("sanitizeInput removes control characters", function (assert) {
    const service = GeminiService.getInstance();

    // 1. Normal Text
    let input = "Normal Text";
    let expected = "Normal Text";
    assert.strictEqual(service.sanitizeInput(input), expected, "Normal text is unchanged");

    // 2. Newlines
    input = "Line 1\nLine 2";
    expected = "Line 1Line 2";
    assert.strictEqual(service.sanitizeInput(input), expected, "Newlines are removed");

    // 3. Tabs
    input = "Tab\tCharacter";
    expected = "TabCharacter";
    assert.strictEqual(service.sanitizeInput(input), expected, "Tabs are removed");

    // 4. Null bytes
    input = "Null\0Byte";
    expected = "NullByte";
    assert.strictEqual(service.sanitizeInput(input), expected, "Null bytes are removed");
});
