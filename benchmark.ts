const escapeCsvField = (field: string) => {
    // dummy escape
    return `"${field.replace(/"/g, '""')}"`;
};

function testMapJoin(items: any[]) {
    return items.map(c => escapeCsvField(c.name)).join("\n");
}

function testPreAlloc(items: any[]) {
    const len = items.length;
    const arr = new Array<string>(len);
    for (let i = 0; i < len; i++) {
        arr[i] = escapeCsvField(items[i].name);
    }
    return arr.join("\n");
}

const data = [];
for (let i = 0; i < 100; i++) {
    data.push({ name: `client_${i}_${Math.random()}` });
}

// Warmup
for (let i = 0; i < 1000; i++) {
    testMapJoin(data);
    testPreAlloc(data);
}

const ITERATIONS = 100000;

// Alternate to avoid GC favoring one
let mapTotal = 0;
let preTotal = 0;

for (let j = 0; j < 5; j++) {
    const startMapJoin = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        testMapJoin(data);
    }
    const endMapJoin = performance.now();
    mapTotal += (endMapJoin - startMapJoin);

    const startPreAlloc = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        testPreAlloc(data);
    }
    const endPreAlloc = performance.now();
    preTotal += (endPreAlloc - startPreAlloc);
}

console.log(`MapJoin: ${(mapTotal / 5).toFixed(2)}ms`);
console.log(`PreAlloc: ${(preTotal / 5).toFixed(2)}ms`);
