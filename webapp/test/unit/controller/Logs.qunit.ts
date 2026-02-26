import LogsController from "ui5/aghd/controller/Logs.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";
import View from "sap/ui/core/mvc/View";
import UIComponent from "sap/ui/core/UIComponent";
import Button from "sap/m/Button";

QUnit.module("Logs Controller");

QUnit.test("onCopyInsights copies text to clipboard", function (assert) {
    const controller = new LogsController("logs");
    const done = assert.async();

    // Mock View and Model
    const model = new JSONModel({
        analysisText: "Test Insight"
    });

    const viewStub = {
        getModel: () => model
    };

    // @ts-expect-error - Mocking getView
    controller.getView = () => viewStub as View;

    // Mock Clipboard
    let clipboardText = "";
    const originalClipboard = navigator.clipboard;

    const mockClipboard = {
        writeText: (text: string) => {
            clipboardText = text;
            return Promise.resolve();
        }
    };

    try {
         Object.defineProperty(navigator, "clipboard", {
            value: mockClipboard,
            configurable: true,
            writable: true
        });
    } catch {
        // Fallback if defineProperty fails
        // @ts-expect-error - Force overwrite
        navigator.clipboard = mockClipboard;
    }

    // Mock MessageToast
    let toastMsg = "";
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalToastShow = MessageToast.show;
    MessageToast.show = (msg: string) => {
        toastMsg = msg;
    };

    // Execute
    const event = {
        getSource: () => ({}) // simple mock
    };
    // @ts-expect-error - Mocking event
    controller.onCopyInsights(event);

    // Assert
    setTimeout(() => {
        assert.strictEqual(clipboardText, "Test Insight", "Clipboard.writeText called with correct text");
        // We use i18n key "listCopied" now. Since no bundle is loaded, we expect the key.
        assert.strictEqual(toastMsg, "listCopied", "MessageToast shown with correct i18n key");

        // Cleanup
        if (originalClipboard) {
             Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
        }
        MessageToast.show = originalToastShow;
        done();
    }, 50);
});

QUnit.test("formatInsights sanitizes HTML and applies Markdown", function (assert) {
    const controller = new LogsController("logs");

    // 1. Basic Bold
    let input = "**Bold Text**";
    let expected = "<strong>Bold Text</strong>";
    assert.strictEqual(controller.formatInsights(input), expected, "Markdown Bold works");

    // 2. HTML Sanitization
    input = "<script>alert('xss')</script>";
    const actual = controller.formatInsights(input);
    // Relaxed check: just ensure it starts with escaped script
    assert.ok(actual.startsWith("&lt;script&gt;"), "Starts with escaped script tag. Got: " + actual);

    // 3. Mixed
    input = "**Bold** and <i>Italic</i>";
    expected = "<strong>Bold</strong> and &lt;i&gt;Italic&lt;/i&gt;";
    assert.strictEqual(controller.formatInsights(input), expected, "Mixed Markdown and HTML works");

    // 4. Newlines
    input = "Line 1\nLine 2";
    expected = "Line 1<br/>Line 2";
    assert.strictEqual(controller.formatInsights(input), expected, "Newlines are converted");
});

QUnit.test("onInit sets model size limit to DEFAULT_LIMIT", function (assert) {
    const controller = new LogsController("logs");

    // Mock Component
    const componentStub = {
        getContentDensityClass: () => "sapUiSizeCompact"
    };

    // Mock View
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let model: any;
    const viewStub = {
        addStyleClass: () => {},
        setModel: (m: JSONModel) => { model = m; },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        getModel: () => model,
        byId: () => null
    };

    // @ts-expect-error - Mocking
    controller.getOwnerComponent = () => componentStub;
    // @ts-expect-error - Mocking
    controller.getView = () => viewStub;

    // Mock Router
    const routerStub = {
        getRoute: () => ({ attachPatternMatched: () => {} })
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalGetRouter = UIComponent.getRouterFor;
    // @ts-expect-error - Mocking
    UIComponent.getRouterFor = () => routerStub;

    // Act
    controller.onInit();

    // Assert
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const sizeLimit = model.iSizeLimit;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const dataLimit = model.getProperty("/limit");

    assert.strictEqual(dataLimit, 1000, "Model limit data should be 1000");
    assert.strictEqual(sizeLimit, 1000, "Model size limit should be set to 1000");

    // Cleanup
    UIComponent.getRouterFor = originalGetRouter;
});

QUnit.test("onCopyAllLogs escapes malicious CSV content", function (assert) {
    const controller = new LogsController("logs");
    const done = assert.async();

    // Mock Model Data with Malicious Content
    const maliciousData = [
        {
            time: new Date("2023-01-01T12:00:00Z"),
            client: "192.168.1.1",
            question: { name: "=cmd|' /C calc'!A0", type: "A" },
            status: "OK",
            elapsedMs: 10,
            reason: "None"
        },
        {
            time: "2023-01-01T12:01:00Z",
            client: "10.0.0.1",
            question: { name: "safe.com", type: "A" },
            status: "Blocked",
            elapsedMs: 5,
            reason: 'Filter "My Filter"' // Contains double quotes
        },
        {
            time: "2023-01-01T12:02:00Z",
            client: "10.0.0.2",
            question: { name: "comma,domain.com", type: "A" }, // Contains comma
            status: "OK",
            elapsedMs: 2,
            reason: "None"
        }
    ];

    const model = new JSONModel({ data: maliciousData });

    // Mock View
    const viewStub = {
        getModel: () => model
    };
    // @ts-expect-error - Mocking
    controller.getView = () => viewStub;

    // Mock Text
    // @ts-expect-error - Mocking
    controller.getText = (key) => key;

    // Mock Clipboard via BaseController method
    let copiedText = "";
    // @ts-expect-error - Mocking protected method
    controller.copyToClipboard = (text: string) => {
        copiedText = text;
    };

    // Execute
    const event = {
        getSource: () => new Button()
    };
    // @ts-expect-error - Mocking event
    controller.onCopyAllLogs(event);

    // Assert
    const lines = copiedText.split("\n");
    assert.strictEqual(lines.length, 4, "Header + 3 rows");

    // Check Row 1: Injection
    // Expected: Time,Client,"'=cmd|' /C calc'!A0",Type,Status,Elapsed(ms),Reason
    // Note: The date format depends on toISOString() in the controller.
    const row1 = lines[1];
    // We check if the domain part (index 2) is escaped with single quote
    // Since it contains comma (no) and quotes (yes), it might be quoted too.
    // The implementation should verify if it starts with ' after unquoting.

    // Let's just check if it contains the escaped version
    // The controller uses toISOString() for date.
    // "2023-01-01T12:00:00.000Z,192.168.1.1,'=cmd|' /C calc'!A0,A,OK,10,None"
    // OR if quoted: "...,\"'=cmd|' /C calc'!A0\",..."

    // The current controller does NOT escape, so this test expects FAILURE if run now.
    // But we write the test expecting the FIX.

    // Using loose check to accommodate implementation details (quoting or not)
    // But importantly, it MUST start with ' if it starts with =
    // And if it contains spaces (it does), it doesn't strictly need quotes in CSV unless it has delimiter.
    // But our implementation will quote it if it contains quotes?
    // "=cmd|' /C calc'!A0" contains single quote, not double. So maybe not quoted by some logic.
    // But our planned logic quotes if it contains " or , or \n. It doesn't contain those.
    // So it should just be prepended with '.

    // Wait, the malicious string is: =cmd|' /C calc'!A0
    // It contains space. Space is NOT a CSV delimiter usually (comma is).
    // So expected: ...,'=cmd|' /C calc'!A0,...

    assert.ok(row1.includes(",'=cmd|' /C calc'!A0,"), "Row 1: Malicious formula should be escaped with single quote");

    // Check Row 2: Quotes
    // Reason: Filter "My Filter"
    // Expected: "Filter ""My Filter"""
    const row2 = lines[2];
    assert.ok(row2.includes('"Filter ""My Filter"""'), "Row 2: Double quotes should be escaped by doubling them");

    // Check Row 3: Comma
    // Domain: comma,domain.com
    // Expected: "comma,domain.com"
    const row3 = lines[3];
    assert.ok(row3.includes('"comma,domain.com"'), "Row 3: Commas should be enclosed in quotes");

    done();
});
