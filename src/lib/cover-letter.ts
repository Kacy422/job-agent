/**
 * Cover Letter plain-text helpers + Word/PDF paragraph export.
 * State always stores plain text with blank-line paragraph breaks (\n\n).
 */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Normalize model / editor text into consistent \n\n paragraphs */
export function normalizeCoverLetterText(raw: string): string {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Split into paragraphs (greeting / body / closing) */
export function splitCoverParagraphs(text: string): string[] {
  const normalized = normalizeCoverLetterText(text);
  if (!normalized) return [];
  // Prefer blank-line splits; fall back to single newlines if model returned dense text
  let parts = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1 && normalized.includes("\n")) {
    parts = normalized.split(/\n/).map((p) => p.trim()).filter(Boolean);
  }
  return parts;
}

/**
 * Word-safe HTML: each paragraph is a real <p> (Word maps these to w:p).
 * Avoids white-space:pre-wrap only (often collapses into one block in Word).
 */
export function wrapCoverLetterAsDoc(text: string): string {
  const paras = splitCoverParagraphs(text);
  if (!paras.length) {
    return `<div class="export-doc cover-letter-doc"><p>&nbsp;</p></div>`;
  }
  const html = paras
    .map((p) => {
      const inner = escapeHtml(p).replace(/\n/g, "<br/>");
      return `<p class="cl-p" style="margin:0 0 12pt 0; line-height:1.5; font-size:12pt; font-family:Arial,Helvetica,sans-serif;">${inner}</p>`;
    })
    .join("\n");
  return `<div class="export-doc cover-letter-doc">${html}</div>`;
}

/** Preview / contentEditable seed HTML */
export function coverLetterTextToEditorHtml(text: string): string {
  const paras = splitCoverParagraphs(text);
  if (!paras.length) return "<p><br/></p>";
  return paras
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/** contentEditable HTML → plain text with \n\n between blocks */
export function coverLetterEditorHtmlToText(html: string): string {
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const blocks = [...tmp.querySelectorAll("p, div")].map((el) =>
      (el.textContent || "").replace(/\u00a0/g, " ").trim()
    );
    const fromBlocks = blocks.filter(Boolean);
    if (fromBlocks.length) {
      return normalizeCoverLetterText(fromBlocks.join("\n\n"));
    }
    return normalizeCoverLetterText(
      (tmp.innerText || tmp.textContent || "").replace(/\u00a0/g, " ")
    );
  }
  // SSR / fallback: crude strip
  return normalizeCoverLetterText(
    html
      .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  );
}
