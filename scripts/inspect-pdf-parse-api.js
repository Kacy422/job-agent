const { PDFParse } = require("pdf-parse");
console.log("PDFParse", typeof PDFParse);
console.log("proto", Object.getOwnPropertyNames(PDFParse.prototype));
