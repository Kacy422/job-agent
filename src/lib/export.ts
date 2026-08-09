import { CV_SHEET_CSS, buildCvTypographyCss } from "@/lib/cv-template";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ExportTypography = {
  fontSizePt?: number;
  lineHeight?: number;
};

function sheetStyles(typography?: ExportTypography) {
  const override = buildCvTypographyCss(
    typography?.fontSizePt,
    typography?.lineHeight
  );
  return `${CV_SHEET_CSS}\n${override}`;
}

/** 浏览器打印对话框导出 PDF（单页 A4） */
export function exportHtmlPdf(
  html: string,
  title = "CV",
  typography?: ExportTypography
) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const isCv = html.includes("cv-sheet");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>${sheetStyles(typography)}
html,body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;}
.export-doc{padding:24px;font-size:12pt;line-height:1.5;}
.cover-letter-doc p.cl-p,
.cover-letter-doc p{margin:0 0 12pt 0;line-height:150%;font-size:12pt;font-family:'Times New Roman',Times,serif;}
@media print{
  @page{size:A4 portrait;margin:${isCv ? "0" : "18mm"}}
  ${
    isCv
      ? `html,body{width:210mm;height:297mm;overflow:hidden}
  .cv-sheet{page-break-after:avoid;page-break-inside:avoid}`
      : `.cover-letter-doc{padding:0}`
  }
}
</style></head><body>${html}
<script>window.onload=()=>{window.print();}</script></body></html>`);
  w.document.close();
  return true;
}

export function wrapPlainAsDoc(text: string) {
  // Legacy helper — prefer wrapCoverLetterAsDoc for letters
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div class="export-doc" style="white-space:pre-wrap;">${escaped}</div>`;
}

export { wrapCoverLetterAsDoc } from "@/lib/cover-letter";

/** Word 兼容 HTML（.doc）— Cover Letter 默认 Times New Roman 小四(12pt) */
export function exportHtmlWord(
  bodyHtml: string,
  filename: string,
  typography?: ExportTypography
) {
  const isCover = /cover-letter-doc|class="cl-p"/i.test(bodyHtml);
  const bodyFont = isCover
    ? `'Times New Roman',Times,serif`
    : `Arial,Helvetica,sans-serif`;
  const bodySize = "12pt";
  const doc = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/><title>${filename}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
${isCover ? "" : sheetStyles(typography)}
/* Cover Letter style: Times New Roman · 小四(12pt) · paragraph spacing */
@font-face{
  font-family:"Times New Roman";
  panose-1:2 2 6 3 5 4 5 2 3 4;
}
body{
  font-family:${bodyFont};
  font-size:${bodySize};
  line-height:150%;
}
.export-doc{margin:0;}
.cover-letter-doc p.cl-p,
.cover-letter-doc p{
  margin:0 0 12pt 0 !important;
  mso-margin-top-alt:0pt;
  mso-margin-bottom-alt:12.0pt;
  line-height:150% !important;
  font-size:12.0pt !important;
  font-family:"Times New Roman",Times,serif !important;
  mso-fareast-font-family:"Times New Roman";
  mso-bidi-font-family:"Times New Roman";
}
p{margin:0 0 12pt 0; font-family:${bodyFont}; font-size:${bodySize};}
</style></head><body>${bodyHtml}</body></html>`;
  const blob = new Blob(["\ufeff", doc], {
    type: "application/msword;charset=utf-8",
  });
  const safe = filename.replace(/[\\/:*?"<>|]+/g, "_");
  downloadBlob(blob, safe.endsWith(".doc") ? safe : `${safe}.doc`);
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
