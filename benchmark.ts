
import formatter from "./webapp/model/formatter.ts";

const iterations = 1_000_000;
const stringVal = "123.456";
const numberVal = 123.456;

console.log(`Running benchmark with ${iterations} iterations...`);

// Benchmark string input
const startString = performance.now();
for (let i = 0; i < iterations; i++) {
    formatter.formatElapsed(stringVal);
}
const endString = performance.now();
console.log(`String input: ${endString - startString}ms`);

// Benchmark number input
const startNumber = performance.now();
for (let i = 0; i < iterations; i++) {
    formatter.formatElapsed(numberVal);
}
const endNumber = performance.now();
console.log(`Number input: ${endNumber - startNumber}ms`);

const improvement = ((endString - startString) - (endNumber - startNumber)) / (endString - startString) * 100;
console.log(`Potential improvement: ${improvement.toFixed(2)}%`);
