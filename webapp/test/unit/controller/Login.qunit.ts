import LoginController from "ui5/aghd/controller/Login.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Login controller test");

QUnit.test("The LoginController class has onInit and onAfterRendering methods", function (assert) {
    assert.strictEqual(typeof LoginController.prototype.onInit, "function", "onInit exists");
    assert.strictEqual(typeof LoginController.prototype.onAfterRendering, "function", "onAfterRendering exists");
});

QUnit.test("onShowPassword toggles password visibility", function (assert) {
    const controller = new LoginController("loginController");

    let currentType = "Password";
    let currentIcon = "sap-icon://show";

    const inputMock = {
        getType: () => currentType,
        setType: (type: string) => { currentType = type; },
        setValueHelpIconSrc: (icon: string) => { currentIcon = icon; }
    };

    const eventMock = {
        getSource: () => inputMock
    };

    // First toggle: Password -> Text
    // @ts-expect-error - mock event object
    controller.onShowPassword(eventMock);
    assert.strictEqual(currentType, "Text", "Switched to Text");
    assert.strictEqual(currentIcon, "sap-icon://hide", "Icon switched to hide");

    // Second toggle: Text -> Password
    // @ts-expect-error - mock event object
    controller.onShowPassword(eventMock);
    assert.strictEqual(currentType, "Password", "Switched back to Password");
    assert.strictEqual(currentIcon, "sap-icon://show", "Icon switched back to show");
});
