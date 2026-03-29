import QUnit from "sap/ui/thirdparty/qunit-2";

QUnit.module("GeminiService IPv6 Masking Benchmark");

QUnit.test("IPv6 masking performance comparison", function (assert) {
	const iterations = 50000;
	const clientIPv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
	const clientShortIPv6 = "2001:0db8";

	// 1. Original algorithm
	const originalMask = (client: string) => {
		if (client.includes(":")) {
			const parts = client.split(":");
			if (parts.length > 4) {
				return parts.slice(0, 4).join(":") + ":xxxx:xxxx:xxxx:xxxx";
			} else {
				const lastColon = client.lastIndexOf(":");
				return (lastColon > -1 ? client.substring(0, lastColon) : client) + ":xxxx";
			}
		}
		return client;
	};

	// 2. Optimized algorithm
	const optimizedMask = (client: string) => {
		if (client.includes(":")) {
			let idx = client.indexOf(":");
			let colons = 0;
			while (idx !== -1 && colons < 3) {
				colons++;
				idx = client.indexOf(":", idx + 1);
			}
			if (idx !== -1) {
				return client.substring(0, idx) + ":xxxx:xxxx:xxxx:xxxx";
			} else {
				const lastColon = client.lastIndexOf(":");
				return (lastColon > -1 ? client.substring(0, lastColon) : client) + ":xxxx";
			}
		}
		return client;
	};

	// Warmup
	for (let i = 0; i < 100; i++) {
		originalMask(clientIPv6);
		optimizedMask(clientIPv6);
	}

	// Benchmark Original
	const startOriginal = performance.now();
	for (let i = 0; i < iterations; i++) {
		originalMask(clientIPv6);
		originalMask(clientShortIPv6);
	}
	const durationOriginal = performance.now() - startOriginal;

	// Benchmark Optimized
	const startOptimized = performance.now();
	for (let i = 0; i < iterations; i++) {
		optimizedMask(clientIPv6);
		optimizedMask(clientShortIPv6);
	}
	const durationOptimized = performance.now() - startOptimized;

	console.log(`BENCHMARK IPv6 Original: ${durationOriginal.toFixed(2)}ms`);
	console.log(`BENCHMARK IPv6 Optimized: ${durationOptimized.toFixed(2)}ms`);

	// Verify correctness
	assert.strictEqual(optimizedMask(clientIPv6), originalMask(clientIPv6), "Output matches for long IPv6");
	assert.strictEqual(optimizedMask(clientShortIPv6), originalMask(clientShortIPv6), "Output matches for short IPv6");

	assert.ok(
		durationOptimized < durationOriginal,
		`Optimized is faster (${durationOptimized.toFixed(2)}ms vs ${durationOriginal.toFixed(2)}ms)`
	);
});
