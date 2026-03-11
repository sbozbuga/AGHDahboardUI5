class Button {
    constructor(text) {
        this.text = text;
        this.icon = "icon";
        this.tooltip = "tooltip";
    }
    setIcon(icon) { this.icon = icon; }
    setTooltip(tooltip) { this.tooltip = tooltip; }
    getText() { return this.text; }
}

class Column {
    constructor(header) {
        this.header = header;
    }
    getHeader() { return this.header; }
}

const columns = [];
for (let i = 0; i < 100; i++) {
    columns.push(new Column(new Button("Button " + i)));
}

function resetColumnIconsForEach(activeButton) {
    columns.forEach((col) => {
        const header = col.getHeader();
        if (header && header !== activeButton && header instanceof Button) {
            header.setIcon("");
            header.setTooltip(header.getText());
        }
    });
}

function resetColumnIconsForOf(activeButton) {
    for (const col of columns) {
        const header = col.getHeader();
        if (header && header !== activeButton && header instanceof Button) {
            header.setIcon("");
            header.setTooltip(header.getText());
        }
    }
}

function resetColumnIconsFor(activeButton) {
    for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const header = col.getHeader();
        if (header && header !== activeButton && header instanceof Button) {
            header.setIcon("");
            header.setTooltip(header.getText());
        }
    }
}

// Warmup
for (let i = 0; i < 10000; i++) {
    resetColumnIconsForEach(null);
    resetColumnIconsForOf(null);
    resetColumnIconsFor(null);
}

const iterations = 100000;

console.time("forEach");
for (let i = 0; i < iterations; i++) {
    resetColumnIconsForEach(null);
}
console.timeEnd("forEach");

console.time("for...of");
for (let i = 0; i < iterations; i++) {
    resetColumnIconsForOf(null);
}
console.timeEnd("for...of");

console.time("for");
for (let i = 0; i < iterations; i++) {
    resetColumnIconsFor(null);
}
console.timeEnd("for");
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
