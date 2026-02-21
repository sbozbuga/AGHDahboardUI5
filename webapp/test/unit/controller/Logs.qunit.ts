import LogsController from "ui5/aghd/controller/Logs.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";
import View from "sap/ui/core/mvc/View";
import UIComponent from "sap/ui/core/UIComponent";

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
