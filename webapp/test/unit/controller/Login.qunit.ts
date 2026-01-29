import LoginController from "ui5/aghd/controller/Login.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Login controller test");

QUnit.test("The LoginController class has onInit and onAfterRendering methods", function (assert) {
    assert.strictEqual(typeof LoginController.prototype.onInit, "function", "onInit exists");
    assert.strictEqual(typeof LoginController.prototype.onAfterRendering, "function", "onAfterRendering exists");
});
