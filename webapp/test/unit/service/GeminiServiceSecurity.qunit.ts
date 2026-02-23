import GeminiService from "ui5/aghd/service/GeminiService";
import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("Gemini Service - Security Enhancements");

QUnit.test("anonymizeClient should redact PII from hostnames", function(assert) {
    const service = GeminiService.getInstance();
    // Access private method for testing (using any cast)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const anonymize = (service as any).anonymizeClient.bind(service);

    // IPv4 (Existing behavior)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    assert.strictEqual(anonymize("192.168.1.50"), "192.168.1.xxx", "IPv4 should be anonymized");

    // IPv6 (Existing behavior)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    assert.strictEqual(anonymize("2001:db8::1"), "2001:db8::xxxx", "IPv6 should be anonymized");

    // Hostnames
    const hostname = "Johns-iPhone";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const result = anonymize(hostname);

    assert.notEqual(result, hostname, "Hostname should be redacted");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    assert.ok(result.startsWith("Client-") || result.includes("xxx"), "Hostname should be masked");
});
