const iterations = 10000;
const queries = [];
for (let i = 0; i < 5000; i++) {
    queries.push({ domain: "example" + i + ".com" });
}

function escapeCsvField(val) {
    return val;
}

function methodMap() {
    return queries.map(q => escapeCsvField(q.domain)).join("\n");
}

function methodFor() {
    const len = queries.length;
    const arr = new Array(len);
    for (let i = 0; i < len; i++) {
        arr[i] = escapeCsvField(queries[i].domain);
    }
    return arr.join("\n");
}

// Warmup
for (let i = 0; i < 100; i++) {
    methodMap();
    methodFor();
}

console.time("methodMap");
for (let i = 0; i < iterations; i++) {
    methodMap();
}
console.timeEnd("methodMap");

console.time("methodFor");
for (let i = 0; i < iterations; i++) {
    methodFor();
}
console.timeEnd("methodFor");
