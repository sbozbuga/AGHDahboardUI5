// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */
import AdGuardService from "ui5/aghd/service/AdGuardService";
import QUnit from "sap/ui/thirdparty/qunit-2";
import sinon from "sap/ui/thirdparty/sinon";

QUnit.module("AdGuardService Security");

QUnit.test("_openLoginPopup uses noopener and noreferrer", function (assert) {
    const service = AdGuardService.getInstance();

    // Stub window.open to prevent actual popup and return a mock object
    const openStub = sinon.stub(window, "open");
    openStub.returns({ closed: false, close: () => {} } as Window);

    try {
        // Access private method
        (service as any)._openLoginPopup();

        assert.ok(openStub.calledOnce, "window.open should be called once");

        // Get the arguments of the first call
        const args = openStub.getCall(0).args;
        const features = args[2] || "";

        assert.ok(features.includes("noopener"), "Features string should contain 'noopener'. Actual: " + features);
        assert.ok(features.includes("noreferrer"), "Features string should contain 'noreferrer'. Actual: " + features);

    } finally {
        // Restore window.open
        openStub.restore();
    }
});
