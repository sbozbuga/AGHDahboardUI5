import SettingsService from "ui5/aghd/service/SettingsService";

QUnit.module("SettingsService", {
    beforeEach: function() {
        // Reset state before each test
        SettingsService.getInstance().setBaseUrl("");
    },
    afterEach: function() {
        // Clean up
        SettingsService.getInstance().setBaseUrl("");
    }
});

QUnit.test("setBaseUrl allows valid URLs", function(assert) {
    const service = SettingsService.getInstance();

    // Valid HTTP
    service.setBaseUrl("http://example.com");
    assert.strictEqual(service.getBaseUrl(), "http://example.com", "Accepts http://");

    // Valid HTTPS
    service.setBaseUrl("https://example.com");
    assert.strictEqual(service.getBaseUrl(), "https://example.com", "Accepts https://");

    // Valid with trailing slash (should be stripped)
    service.setBaseUrl("https://example.com/");
    assert.strictEqual(service.getBaseUrl(), "https://example.com", "Strips trailing slash");

    // Valid Empty
    service.setBaseUrl("");
    assert.strictEqual(service.getBaseUrl(), "", "Accepts empty string");
});

QUnit.test("setBaseUrl throws on invalid URLs", function(assert) {
    const service = SettingsService.getInstance();

    // Invalid Protocol
    assert.throws(() => {
        service.setBaseUrl("ftp://example.com");
    }, /Invalid Base URL/, "Throws on ftp://");

    // Invalid Script
    assert.throws(() => {
        service.setBaseUrl("javascript:alert(1)");
    }, /Invalid Base URL/, "Throws on javascript:");

    // Invalid Text
    assert.throws(() => {
        service.setBaseUrl("randomtext");
    }, /Invalid URL format/, "Throws on plain text");

    // Security: Credentials
    assert.throws(() => {
        service.setBaseUrl("http://user:pass@example.com");
    }, /Base URL must not contain credentials/, "Throws on embedded credentials");
});

QUnit.test("Input Validation: Length Limits", function (assert) {
    const service = SettingsService.getInstance();

    // 1. System Context Length
    const longContext = "A".repeat(1001);
    assert.throws(() => {
        service.setSystemContext(longContext);
    }, /System Context is too long/, "Throws when System Context exceeds limit");

    service.setSystemContext("A".repeat(1000));
    assert.strictEqual(service.getSystemContext().length, 1000, "Accepts System Context at limit");

    // 2. API Key Length
    const longKey = "A".repeat(256);
    assert.throws(() => {
        service.setApiKey(longKey);
    }, /API Key is too long/, "Throws when API Key exceeds limit");

    service.setApiKey("A".repeat(255));
    assert.strictEqual(service.getApiKey().length, 255, "Accepts API Key at limit");
});
