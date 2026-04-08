/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method, @typescript-eslint/no-unused-vars */
import AuthService from "ui5/aghd/service/AuthService";
import SettingsService from "ui5/aghd/service/SettingsService";
import MessageBox from "sap/m/MessageBox";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("AuthService Security");

QUnit.test("_isSafeUrl validates URLs correctly", function (assert) {
	const service = AuthService.getInstance();
	const isSafeUrl = (service as any)._isSafeUrl.bind(service);

	assert.ok(isSafeUrl("/relative/path"), "Relative URL is safe");
	assert.ok(isSafeUrl("http://localhost/"), "Localhost is safe");
	assert.ok(isSafeUrl("http://127.0.0.1/"), "127.0.0.1 is safe");
	assert.ok(isSafeUrl(window.location.href), "Same origin is safe");

	assert.ok(isSafeUrl("http://192.168.1.1/"), "Private IP 192.168.x.x is safe");
	assert.ok(isSafeUrl("http://10.0.0.1/"), "Private IP 10.x.x.x is safe");

	assert.notOk(isSafeUrl("http://google.com"), "Public domain is unsafe");
	assert.notOk(isSafeUrl("//attacker.com"), "Protocol-relative URL is unsafe");
});

QUnit.test("_openLoginPopup warns on unsafe URL", function (assert) {
	const service = AuthService.getInstance();
	const originalOpen = window.open;
	const originalConfirm = MessageBox.confirm;
	const originalGetBaseUrl = SettingsService.getInstance().getBaseUrl;

	let openCalled = false;
	let confirmCalled = false;

	window.open = (() => {
		openCalled = true;
		return { closed: false, close: () => {} };
	}) as any;

	MessageBox.confirm = (_message: any, options: any) => {
		confirmCalled = true;
		if (options && options.onClose) {
			options.onClose(MessageBox.Action.OK);
		}
	};

	SettingsService.getInstance().getBaseUrl = () => "http://google.com";

	try {
		(service as any)._openLoginPopup();
		assert.ok(confirmCalled, "MessageBox.confirm should be called for unsafe URL");
		assert.ok(openCalled, "window.open should be called after confirmation");
	} finally {
		window.open = originalOpen;
		MessageBox.confirm = originalConfirm;
		SettingsService.getInstance().getBaseUrl = originalGetBaseUrl;
	}
});

QUnit.test("_openLoginPopup proceeds on safe URL", function (assert) {
	const service = AuthService.getInstance();
	const originalOpen = window.open;
	const originalConfirm = MessageBox.confirm;
	const originalGetBaseUrl = SettingsService.getInstance().getBaseUrl;

	let openCalled = false;
	let confirmCalled = false;

	window.open = ((_url: any, _name: any, features: string) => {
		openCalled = true;
		assert.ok(features.includes("noopener"), "Features should include noopener");
		return { closed: false, close: () => {} };
	}) as any;

	MessageBox.confirm = () => {
		confirmCalled = true;
	};

	SettingsService.getInstance().getBaseUrl = () => "http://192.168.1.50";

	try {
		(service as any)._openLoginPopup();
		assert.notOk(confirmCalled, "MessageBox.confirm should not be called for safe URL");
		assert.ok(openCalled, "window.open should be called immediately");
	} finally {
		window.open = originalOpen;
		MessageBox.confirm = originalConfirm;
		SettingsService.getInstance().getBaseUrl = originalGetBaseUrl;
	}
});

QUnit.test("login sends correct request", async function (assert) {
	const service = AuthService.getInstance();
	const originalRequest = (service as any)._request;

	let requestArgs: any = null;
	(service as any)._request = (endpoint: string, options: any) => {
		requestArgs = { endpoint, options };
		return Promise.resolve();
	};

	try {
		await service.login("admin", "p@ssword");
		assert.ok(requestArgs, "Request should be called");
		assert.strictEqual(requestArgs.endpoint, "/control/login", "Endpoint should be correct");
		const body = JSON.parse(requestArgs.options.body);
		assert.strictEqual(body.name, "admin", "User name should be correct");
	} finally {
		(service as any)._request = originalRequest;
	}
});

QUnit.test("logout clears credentials", async function (assert) {
	const service = AuthService.getInstance();
	const originalRequest = (service as any)._request;
	const originalClear = SettingsService.getInstance().clearCredentials;

	let logoutRequestSent = false;
	let credentialsCleared = false;

	(service as any)._request = () => {
		logoutRequestSent = true;
		return Promise.resolve();
	};
	SettingsService.getInstance().clearCredentials = () => {
		credentialsCleared = true;
	};

	try {
		await service.logout();
		assert.ok(logoutRequestSent, "Logout request should be sent");
		assert.ok(credentialsCleared, "clearCredentials should be called");
	} finally {
		(service as any)._request = originalRequest;
		SettingsService.getInstance().clearCredentials = originalClear;
	}
});

QUnit.module("AuthService Session Handling");

QUnit.test("_handleSessionExpiration opens MessageBox", function (assert) {
	const service = AuthService.getInstance();
	const originalWarning = MessageBox.warning;
	const originalGetBaseUrl = SettingsService.getInstance().getBaseUrl;

	let warningCalled = false;
	MessageBox.warning = ((_msg: any, _options: any) => {
		warningCalled = true;
	}) as any;

	SettingsService.getInstance().getBaseUrl = () => "http://localhost";

	try {
		(service as any)._isLoginDialogOpen = false;
		(service as any)._handleSessionExpiration();

		assert.ok(warningCalled, "MessageBox.warning should be called");
		assert.ok((service as any)._isLoginDialogOpen, "_isLoginDialogOpen should be true");
	} finally {
		MessageBox.warning = originalWarning;
		SettingsService.getInstance().getBaseUrl = originalGetBaseUrl;
	}
});
