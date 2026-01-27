import LogsController from "ui5/aghd/controller/Logs.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Logs Controller");

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
