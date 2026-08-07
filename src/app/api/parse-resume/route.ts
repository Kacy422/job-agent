import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const TEXT_EXTS = new Set([".txt", ".md", ".markdown"]);
const BINARY_EXTS = new Set([".pdf", ".docx"]);

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

/** pdf-parse v2：命名导出 PDFParse 类 */
async function parsePdf(buffer: Buffer): Promise<string> {
  // Buffer 会被库内部转为 Uint8Array；复制一份避免 Transferable 清空原 buffer
  const data = new Uint8Array(buffer);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return String(result?.text || "");
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return String(result?.value || "");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "请上传简历文件（字段名：file）" },
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
    if (![...TEXT_EXTS, ...BINARY_EXTS].includes(ext)) {
      return NextResponse.json(
        {
          error: "暂不支持该格式，请上传 .txt / .md / .markdown / .pdf / .docx",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (TEXT_EXTS.has(ext)) {
      text = buffer.toString("utf-8");
    } else if (ext === ".pdf") {
      text = await parsePdf(buffer);
    } else if (ext === ".docx") {
      text = await parseDocx(buffer);
    }

    text = normalizeText(text);
    if (!text) {
      return NextResponse.json(
        {
          error:
            "未能从文件中提取到文本，请确认 PDF/Word 含可选中文字（扫描件需 OCR）",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      filename: file.name,
      format: ext.replace(".", ""),
      chars: text.length,
    });
  } catch (err) {
    console.error("[parse-resume]", err);
    const message = err instanceof Error ? err.message : "解析失败";
    return NextResponse.json(
      { error: `简历解析失败：${message}` },
      { status: 500 }
    );
  }
}
