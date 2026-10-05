import type { UploadedCvAttachment } from "@/types";

export const UPLOADED_CV_ACCEPT =
  ".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

const TEXT_MAX = 24_000;
const HTML_MAX = 32_000;
const DB_NAME = "job-agent-cv-files";
const STORE = "files";
const DB_VERSION = 1;

export type StoredCvFile = {
  id: string;
  filename: string;
  mimeType: string;
  blob: Blob;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function normalizeUploadedCv(
  raw: unknown
): UploadedCvAttachment | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const filename = String(o.filename || "").trim().slice(0, 180);
  const text = String(o.text || "").trim().slice(0, TEXT_MAX);
  const html = String(o.html || "").trim().slice(0, HTML_MAX);
  if (!filename && !text && !html) return undefined;
  return {
    filename: filename || "cv",
    format: String(o.format || "").replace(/^\./, "").toLowerCase().slice(0, 16),
    mimeType: String(o.mimeType || "").trim() || undefined,
    uploadedAt: String(o.uploadedAt || "") || new Date().toISOString(),
    text,
    html: html || undefined,
    chars: Number(o.chars) || text.length,
  };
}

export function wrapUploadedCvAsHtml(
  att: UploadedCvAttachment | undefined | null
): string {
  if (!att) return "";
  const inner = String(att.html || "").trim();
  const body = inner
    ? inner
    : `<pre class="cv-uploaded-pre">${escapeHtml(att.text || "")}</pre>`;
  const name = escapeHtml(att.filename || "Uploaded CV");
  return `<div class="cv-sheet cv-uploaded-sheet"><p class="cv-uploaded-meta">Uploaded CV · ${name}</p><div class="cv-uploaded-body">${body}</div></div>`;
}

export function hasUploadedCv(
  att: UploadedCvAttachment | undefined | null
): boolean {
  return Boolean(att && (att.text?.trim() || att.html?.trim() || att.filename));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error || new Error("IndexedDB open failed"));
  });
}

export async function saveUploadedCvFile(
  rec: StoredCvFile
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(rec);
  });
  db.close();
}

export async function getUploadedCvFile(
  id: string
): Promise<StoredCvFile | null> {
  try {
    const db = await openDb();
    const rec = await new Promise<StoredCvFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as StoredCvFile) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rec;
  } catch {
    return null;
  }
}

export async function deleteUploadedCvFile(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(id);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "cv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadUploadedCv(appId: string, att?: UploadedCvAttachment) {
  const rec = await getUploadedCvFile(appId);
  if (rec?.blob) {
    downloadBlob(rec.blob, rec.filename || att?.filename || "cv");
    return;
  }
  const text = att?.text || "";
  if (!text) throw new Error("本机未找到原文件，且没有可下载的提取文本");
  const base = (att?.filename || "cv").replace(/\.[^.]+$/, "");
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
}
