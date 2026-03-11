import { performance } from 'perf_hooks';

const data: any[] = [];
for (let i = 0; i < 10000; i++) {
    data.push({
        time: new Date(),
        client: '192.168.1.1',
        question: { name: 'example.com', type: 'A' },
        status: 'filtered',
        blocked: true,
        elapsedMs: 1.5,
        upstream: '1.1.1.1',
        reason: 'FilterList',
        filterId: 1,
        rule: '||example.com^'
    });
}

function escapeCsvField(val: any) {
    if (val === undefined || val === null) return "";
    return String(val).replace(/"/g, '""');
}

function runMap() {
    const start = performance.now();
    const rows = data.map(log => {
        const timeStr = log.time instanceof Date ? log.time.toISOString() : log.time;
        const time = escapeCsvField(timeStr);
        const client = escapeCsvField(log.client);
        const domain = escapeCsvField(log.question?.name);
        const type = escapeCsvField(log.question?.type);
        const status = escapeCsvField(log.status);
        const blocked = escapeCsvField(log.blocked ? "true" : "false");
        const elapsed = escapeCsvField(log.elapsedMs);
        const upstream = escapeCsvField(log.upstream);
        const reason = escapeCsvField(log.reason);
        const filterId = escapeCsvField(log.filterId);
        const rule = escapeCsvField(log.rule);
        return `${time},${client},${domain},${type},${status},${blocked},${elapsed},${upstream},${reason},${filterId},${rule}`;
    }).join("\n");
    return performance.now() - start;
}

function runPreAlloc() {
    const start = performance.now();
    const len = data.length;
    const rowsArr = new Array(len) as string[];
    for (let i = 0; i < len; i++) {
        const log = data[i];
        const timeStr = log.time instanceof Date ? log.time.toISOString() : log.time;
        const time = escapeCsvField(timeStr);
        const client = escapeCsvField(log.client);
        const domain = escapeCsvField(log.question?.name);
        const type = escapeCsvField(log.question?.type);
        const status = escapeCsvField(log.status);
        const blocked = escapeCsvField(log.blocked ? "true" : "false");
        const elapsed = escapeCsvField(log.elapsedMs);
        const upstream = escapeCsvField(log.upstream);
        const reason = escapeCsvField(log.reason);
        const filterId = escapeCsvField(log.filterId);
        const rule = escapeCsvField(log.rule);
        rowsArr[i] = `${time},${client},${domain},${type},${status},${blocked},${elapsed},${upstream},${reason},${filterId},${rule}`;
    }
    const rows = rowsArr.join("\n");
    return performance.now() - start;
}

// Warmup
for (let i = 0; i < 100; i++) {
    runMap();
    runPreAlloc();
}

let mapTotal = 0;
let preAllocTotal = 0;
const iterations = 200;

for (let i = 0; i < iterations; i++) {
    mapTotal += runMap();
    preAllocTotal += runPreAlloc();
}

console.log(`Map: ${mapTotal / iterations} ms`);
console.log(`PreAlloc: ${preAllocTotal / iterations} ms`);
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
