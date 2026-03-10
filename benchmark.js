const iterations = 10000;
const arraySize = 10000;
const array = new Array(arraySize).fill(0).map((_, i) => i);

console.log(`Benchmarking array iteration: Size=${arraySize}, Iterations=${iterations}`);

let start = performance.now();
for (let i = 0; i < iterations; i++) {
    let sum = 0;
    array.forEach(val => {
        sum += val;
    });
}
let end = performance.now();
const forEachTime = end - start;
console.log(`forEach: ${forEachTime.toFixed(2)} ms`);

start = performance.now();
for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (const val of array) {
        sum += val;
    }
}
end = performance.now();
const forOfTime = end - start;
console.log(`for...of: ${forOfTime.toFixed(2)} ms`);

const improvement = ((forEachTime - forOfTime) / forEachTime) * 100;
console.log(`Improvement: ${improvement.toFixed(2)}% faster`);
