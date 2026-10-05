import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const TEXT_EXTS = new Set([".txt", ".md", ".markdown"]);
const EXTRACT_EXTS = new Set([".pdf", ".docx"]);
const BIND_ONLY_EXTS = new Set([".doc"]);

function getExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToHtml(text: string) {
  if (!text.trim()) return "";
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function allowedExt(ext: string) {
  return TEXT_EXTS.has(ext) || EXTRACT_EXTS.has(ext) || BIND_ONLY_EXTS.has(ext);
}

/** pdf-parse v2：失败时返回空字符串，不抛给上层 */
async function parsePdf(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  let parser: {
    getText: () => Promise<{ text?: string }>;
    destroy: () => Promise<void>;
  } | null = null;
  try {
    parser = new PDFParse({ data });
    const result = await parser.getText();
    return String(result?.text || "");
  } catch (err) {
    console.warn("[parse-resume] pdf extract skipped", err);
    return "";
  } finally {
    try {
      await parser?.destroy();
    } catch {
      /* ignore */
    }
  }
}

async function parseDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return String(result?.value || "");
  } catch (err) {
    console.warn("[parse-resume] docx text skipped", err);
    return "";
  }
}

async function parseDocxHtml(buffer: Buffer): Promise<string> {
  try {
    const conv = await mammoth.convertToHtml({ buffer });
    return String(conv?.value || "").trim();
  } catch (err) {
    console.warn("[parse-resume] docx html skipped", err);
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "请选择要上传的简历文件" },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "文件为空" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "文件过大，请上传不超过 8MB 的简历" },
        { status: 400 }
      );
    }

    const ext = getExt(file.name || "");
    if (!allowedExt(ext)) {
      return NextResponse.json(
        {
          error:
            "暂不支持该格式，请上传 .pdf / .docx / .txt / .md（旧版 .doc 可绑定但无法提取文本）",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    let html = "";
    let warning = "";

    try {
      if (TEXT_EXTS.has(ext)) {
        text = buffer.toString("utf-8");
      } else if (ext === ".pdf") {
        text = await parsePdf(buffer);
      } else if (ext === ".docx") {
        text = await parseDocxText(buffer);
        html = await parseDocxHtml(buffer);
      } else if (ext === ".doc") {
        warning = "旧版 .doc 无法提取文本，文件已可绑定；建议另存为 .docx 以便改写底稿。";
      }
    } catch (err) {
      console.warn("[parse-resume] extract failed", err);
      warning =
        "未能从文件中提取文本（可能是扫描件或特殊结构），文件仍会绑定到该岗位。";
    }

    text = normalizeText(text);
    if (!html && text) html = textToHtml(text);

    if (!text && !warning) {
      warning =
        ext === ".pdf"
          ? "未能提取 PDF 文字（扫描件需 OCR）。文件已可绑定，可预览/下载原件。"
          : "未能提取文字。文件已可绑定，可预览/下载原件。";
    }

    return NextResponse.json({
      ok: true,
      text,
      html,
      filename: file.name,
      format: ext.replace(".", ""),
      mimeType: file.type || "",
      chars: text.length,
      extractFailed: !text,
      warning: warning || undefined,
    });
  } catch (err) {
    console.error("[parse-resume]", err);
    // 仍返回 200，让前端把原文件绑定上去
    return NextResponse.json({
      ok: true,
      text: "",
      html: "",
      filename: "",
      format: "",
      mimeType: "",
      chars: 0,
      extractFailed: true,
      warning:
        "文本解析遇到问题，文件仍会绑定到该岗位，可预览或下载原件。",
    });
  }
}
