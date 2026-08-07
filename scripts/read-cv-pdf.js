const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

async function main() {
  const candidates = [
    "cvenvironment_2.pdf",
    "cvenvironment.pdf",
  ].map((f) => path.join(process.cwd(), f));
  const p = candidates.find((f) => fs.existsSync(f));
  if (!p) {
    console.log("NOT_FOUND");
    console.log(
      "root pdfs",
      fs.readdirSync(process.cwd()).filter((f) => f.toLowerCase().endsWith(".pdf"))
    );
    process.exit(1);
  }
  console.log("READING", p);
  const buf = fs.readFileSync(p);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    console.log(result.text);
  } finally {
    await parser.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
