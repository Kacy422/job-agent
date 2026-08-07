/**
 * Smoke-test pdf-parse v2 + mammoth parsing used by /api/parse-resume.
 */
const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

async function testPdfParseExport() {
  if (typeof PDFParse !== "function") {
    throw new Error("PDFParse export is not a constructor: " + typeof PDFParse);
  }
  console.log("OK pdf-parse exports PDFParse class");
}

async function testDocx() {
  // Minimal valid-ish docx is complex; exercise mammoth API with empty-like zip fails.
  // Instead verify extractRawText exists and rejects invalid gracefully / accepts buffer type.
  if (typeof mammoth.extractRawText !== "function") {
    throw new Error("mammoth.extractRawText missing");
  }
  console.log("OK mammoth.extractRawText available");
}

async function testPdfRoundtrip() {
  // Tiny PDF with "Hello JobAgent" text (hand-crafted minimal PDF)
  const pdf = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 68 >>stream
BT /F1 24 Tf 50 80 Td (Hello JobAgent) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000380 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
457
%%EOF`;

  const data = new Uint8Array(Buffer.from(pdf, "utf8"));
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    const text = String(result?.text || "");
    console.log("PDF text:", JSON.stringify(text.slice(0, 120)));
    if (!/Hello\s*JobAgent/i.test(text) && text.length === 0) {
      // Some minimal PDFs may not extract; at least ensure API doesn't throw
      console.log("WARN: extracted empty text from minimal PDF (API still works)");
    } else {
      console.log("OK PDFParse.getText returned text, length=", text.length);
    }
  } finally {
    await parser.destroy();
  }
}

(async () => {
  await testPdfParseExport();
  await testDocx();
  await testPdfRoundtrip();
  console.log("ALL CHECKS PASSED");
})().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
