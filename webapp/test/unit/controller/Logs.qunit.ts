import LogsController from "ui5/aghd/controller/Logs.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";
import View from "sap/ui/core/mvc/View";

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
    controller.onCopyInsights();

    // Assert
    setTimeout(() => {
        assert.strictEqual(clipboardText, "Test Insight", "Clipboard.writeText called with correct text");
        assert.strictEqual(toastMsg, "Insights copied to clipboard.", "MessageToast shown");

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
    expected = "&lt;script&gt;alert('xss')&lt;/script&gt;";
    assert.strictEqual(controller.formatInsights(input), expected, "HTML is escaped");

    // 3. Mixed
    input = "**Bold** and <i>Italic</i>";
    expected = "<strong>Bold</strong> and &lt;i&gt;Italic&lt;/i&gt;";
    assert.strictEqual(controller.formatInsights(input), expected, "Mixed Markdown and HTML works");

    // 4. Newlines
    input = "Line 1\nLine 2";
    expected = "Line 1<br/>Line 2";
    assert.strictEqual(controller.formatInsights(input), expected, "Newlines are converted");
});
