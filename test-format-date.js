const DateFormat = require("sap/ui/core/format/DateFormat");

const oDateTimeFormat = DateFormat.getDateTimeInstance({ pattern: "yyyy-MM-dd HH:mm:ss.SSS" });
const d = new Date();
for(let i=0; i<10000; i++) {
    oDateTimeFormat.format(d);
}
