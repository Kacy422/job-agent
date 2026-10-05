/** PDF stream string scraper — no pdfjs / pdf-parse (safe for client + server). */

function unescapePdfLiteral(inner: string): string {
  return inner
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, " ")
    .replace(/\\f/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, oct: string) =>
      String.fromCharCode(parseInt(oct, 8))
    );
}

function decodeUtf16Be(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = (bytes[i] << 8) | bytes[i + 1];
    if (code === 0) continue;
    out += String.fromCharCode(code);
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "");
  const even = clean.length % 2 === 0 ? clean : clean + "0";
  const out = new Uint8Array(even.length / 2);
  for (let i = 0; i < even.length; i += 2) {
    out[i / 2] = parseInt(even.slice(i, i + 2), 16);
  }
  return out;
}

function looksUseful(s: string): boolean {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length < 2) return false;
  if (/^(obj|endobj|stream|endstream|xref|trailer)$/i.test(t)) return false;
  return /[A-Za-z\u00C0-\u024F\u4e00-\u9fff]/.test(t);
}

/**
 * Extract visible-ish text from PDF bytes without pdfjs.
 * Covers many text-based (not scanned) CVs.
 */
export function extractPdfStringsHeuristic(bytes: Uint8Array): string {
  const latin = (() => {
    let s = "";
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      s += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return s;
  })();
  const chunks: string[] = [];

  const blocks = latin.match(/BT[\s\S]*?ET/g) || [latin];
  const scan = blocks.join("\n");

  const litRe = /\((?:\\.|[^\\)]){1,400}\)/g;
  let m: RegExpExecArray | null;
  while ((m = litRe.exec(scan))) {
    const decoded = unescapePdfLiteral(m[0].slice(1, -1));
    if (looksUseful(decoded)) chunks.push(decoded);
  }

  const hexRe = /<([0-9A-Fa-f\s]{4,})>/g;
  while ((m = hexRe.exec(scan))) {
    try {
      const raw = hexToBytes(m[1]);
      let decoded = "";
      if (raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff) {
        decoded = decodeUtf16Be(raw.subarray(2));
      } else if (raw.length >= 2 && raw[0] === 0 && raw[1] !== 0) {
        decoded = decodeUtf16Be(raw);
      } else {
        decoded = new TextDecoder("utf-8", { fatal: false })
          .decode(raw)
          .replace(/\0/g, "");
      }
      if (looksUseful(decoded)) chunks.push(decoded);
    } catch {
      /* skip */
    }
  }

  return chunks
    .join(" ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}
