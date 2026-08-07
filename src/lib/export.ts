import { CV_SHEET_CSS } from "@/lib/cv-template";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 浏览器打印对话框导出 PDF */
export function exportHtmlPdf(html: string, title = "CV") {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>${CV_SHEET_CSS}
body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;}
.export-doc{padding:24px;font-size:14px;line-height:1.6;white-space:pre-wrap;}
</style></head><body>${html}
<script>window.onload=()=>{window.print();}</script></body></html>`);
  w.document.close();
  return true;
}

/** Word 兼容 HTML（.doc），Office / WPS 可直接打开 */
export function exportHtmlWord(bodyHtml: string, filename: string) {
  const doc = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/><title>${filename}</title>
<style>${CV_SHEET_CSS}
body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;}
.export-doc{white-space:pre-wrap;}
</style></head><body>${bodyHtml}</body></html>`;
  const blob = new Blob(["\ufeff", doc], {
    type: "application/msword;charset=utf-8",
  });
  const safe = filename.replace(/[\\/:*?"<>|]+/g, "_");
  downloadBlob(blob, safe.endsWith(".doc") ? safe : `${safe}.doc`);
}

export function wrapPlainAsDoc(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div class="export-doc">${escaped}</div>`;
}

export function interviewQaToHtml(
  items: { question: string; answer: string; tip?: string }[]
) {
  const blocks = items
    .map(
      (qa, i) =>
        `<div style="margin-bottom:16px"><p><strong>Q${i + 1}. ${escapeHtml(qa.question)}</strong></p>${
          qa.tip
            ? `<p style="color:#92400e">💡 ${escapeHtml(qa.tip)}</p>`
            : ""
        }<p>${escapeHtml(qa.answer).replace(/\n/g, "<br/>")}</p></div>`
    )
    .join("");
  return `<div class="export-doc">${blocks}</div>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
