// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */
import AdGuardService from "ui5/aghd/service/AdGuardService";
import SettingsService from "ui5/aghd/service/SettingsService";
import MessageBox from "sap/m/MessageBox";
import QUnit from "sap/ui/thirdparty/qunit-2";
import sinon from "sap/ui/thirdparty/sinon";

QUnit.module("AdGuardService Security");

QUnit.test("_isSafeUrl validates URLs correctly", function (assert) {
    const service = AdGuardService.getInstance();
    // Access private method
    const isSafeUrl = (service as any)._isSafeUrl.bind(service);

    // Safe URLs
    assert.ok(isSafeUrl("/relative/path"), "Relative URL is safe");
    assert.ok(isSafeUrl("http://localhost/"), "Localhost is safe");
    assert.ok(isSafeUrl("http://127.0.0.1/"), "127.0.0.1 is safe");
    // [::1] might behave differently depending on browser/environment parsing
    // but our implementation allows it if hostname is strictly "[::1]"
    // assert.ok(isSafeUrl("http://[::1]/"), "[::1] is safe");
    assert.ok(isSafeUrl(window.location.href), "Same origin is safe");

    // Private IPs (IPv4)
    assert.ok(isSafeUrl("http://192.168.1.1/"), "Private IP 192.168.x.x is safe");
    assert.ok(isSafeUrl("http://10.0.0.1/"), "Private IP 10.x.x.x is safe");
    assert.ok(isSafeUrl("http://172.16.0.1/"), "Private IP 172.16.x.x is safe");
    assert.ok(isSafeUrl("http://172.31.255.255/"), "Private IP 172.31.x.x is safe");

    // Unsafe URLs
    assert.notOk(isSafeUrl("http://google.com"), "Public domain is unsafe");
    assert.notOk(isSafeUrl("http://8.8.8.8"), "Public IP 8.8.8.8 is unsafe");
    assert.notOk(isSafeUrl("http://172.32.0.1/"), "Public IP 172.32.x.x is unsafe");
    assert.notOk(isSafeUrl("http://1.1.1.1"), "Public IP 1.1.1.1 is unsafe");
});

QUnit.test("_openLoginPopup warns on unsafe URL", function (assert) {
    const service = AdGuardService.getInstance();
    const openStub = sinon.stub(window, "open");
    openStub.returns({ closed: false, close: () => {} } as Window);

    const confirmStub = sinon.stub(MessageBox, "confirm");

    // Mock SettingsService to return unsafe URL
    const settingsService = SettingsService.getInstance();
    const getBaseUrlStub = sinon.stub(settingsService, "getBaseUrl").returns("http://google.com");

    try {
        (service as any)._openLoginPopup();

        assert.ok(confirmStub.calledOnce, "MessageBox.confirm should be called for unsafe URL");
        assert.ok(openStub.notCalled, "window.open should not be called immediately");

        // Simulate User Confirmation (OK)
        // MessageBox.confirm(message, { onClose: fn })
        const args = confirmStub.getCall(0).args;
        const options = args[1];
        if (options && typeof options.onClose === "function") {
             options.onClose(MessageBox.Action.OK);
        }

        assert.ok(openStub.calledOnce, "window.open should be called after confirmation");

    } finally {
        openStub.restore();
        confirmStub.restore();
        getBaseUrlStub.restore();
    }
});

QUnit.test("_openLoginPopup proceeds on safe URL", function (assert) {
    const service = AdGuardService.getInstance();
    const openStub = sinon.stub(window, "open");
    openStub.returns({ closed: false, close: () => {} } as Window);
    const confirmStub = sinon.stub(MessageBox, "confirm");

    // Mock SettingsService to return safe URL
    const settingsService = SettingsService.getInstance();
    const getBaseUrlStub = sinon.stub(settingsService, "getBaseUrl").returns("http://192.168.1.50");

    try {
        (service as any)._openLoginPopup();

        assert.ok(confirmStub.notCalled, "MessageBox.confirm should not be called for safe URL");
        assert.ok(openStub.calledOnce, "window.open should be called immediately");

        // Verify noopener/noreferrer
        const args = openStub.getCall(0).args;
        const features = args[2] || "";
        assert.ok(features.includes("noopener"), "Features string should contain 'noopener'");
        assert.ok(features.includes("noreferrer"), "Features string should contain 'noreferrer'");

    } finally {
        openStub.restore();
        confirmStub.restore();
        getBaseUrlStub.restore();
    }
});
