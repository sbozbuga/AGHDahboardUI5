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
    }, /Invalid Base URL/, "Throws on plain text");
});
