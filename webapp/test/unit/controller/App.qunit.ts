import AppController from "ui5/aghd/controller/App.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Sample App controller test");

QUnit.test("The AppController class has an onInit method", function (assert) {
    // as a very basic test example just check the presence of the "onInit" method
    assert.strictEqual(typeof AppController.prototype.onInit, "function");
});
