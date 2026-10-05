import { createRequire } from "node:module";
import { extractPdfStringsHeuristic } from "@/lib/pdf-heuristic";

export { extractPdfStringsHeuristic };

type PdfParseCtor = new (opts: { data: Uint8Array }) => {
  getText: () => Promise<{ text?: string }>;
  destroy: () => Promise<void>;
};

/**
 * Server-only PDF text extract.
 * Loads pdf-parse via Node require so webpack never bundles its worker.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const copied = Buffer.from(buffer);
  const bytes = Uint8Array.from(copied);

  try {
    const require = createRequire(process.cwd() + "/package.json");
    const mod = require("pdf-parse") as { PDFParse?: PdfParseCtor };
    const PDFParse = mod.PDFParse;
    if (typeof PDFParse === "function") {
      const parser = new PDFParse({ data: bytes });
      try {
        const result = await parser.getText();
        const text = String(result?.text || "").trim();
        if (text) return text;
      } finally {
        try {
          await parser.destroy();
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err) {
    console.warn("[extract-pdf] pdf-parse skipped", err);
  }

  return extractPdfStringsHeuristic(bytes);
}
