const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sequential() {
    const start = performance.now();
    await delay(100);
    await delay(50);
    const end = performance.now();
    return end - start;
}

async function concurrent() {
    const start = performance.now();
    await Promise.all([
        delay(100),
        delay(50)
    ]);
    const end = performance.now();
    return end - start;
}

async function run() {
    console.log("Measuring sequential vs concurrent Promise resolution...");
    let seqSum = 0;
    let conSum = 0;
    const iters = 10;

    for (let i = 0; i < iters; i++) {
        seqSum += await sequential();
        conSum += await concurrent();
    }

    console.log(`Sequential avg: ${seqSum / iters} ms`);
    console.log(`Concurrent avg: ${conSum / iters} ms`);
}

run();
