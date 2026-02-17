import SettingsService from "ui5/aghd/service/SettingsService";

QUnit.module("SettingsService Security", {
    afterEach: function() {
        // Clean up
        const service = SettingsService.getInstance();
        try {
            service.setSystemContext("");
        } catch { /* ignore */ }
        try {
            service.setApiKey("");
        } catch { /* ignore */ }
    }
});

QUnit.test("setSystemContext enforces length limit", function(assert) {
    const service = SettingsService.getInstance();
    const longContext = "a".repeat(1001); // 1000 + 1

    // Should throw error
    assert.throws(() => {
        service.setSystemContext(longContext);
    }, /Context too long/, "Throws when context exceeds 1000 characters");

    // Should not throw
    service.setSystemContext("a".repeat(1000));
    assert.strictEqual(service.getSystemContext(), "a".repeat(1000), "Allows 1000 characters");
});

QUnit.test("setApiKey enforces length limit", function(assert) {
    const service = SettingsService.getInstance();
    const longKey = "a".repeat(256); // 255 + 1

    // Should throw error
    assert.throws(() => {
        service.setApiKey(longKey);
    }, /API Key too long/, "Throws when API Key exceeds 255 characters");

    // Should not throw
    service.setApiKey("a".repeat(255));
    assert.strictEqual(service.getApiKey(), "a".repeat(255), "Allows 255 characters");
});
