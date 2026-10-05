"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SquareKanban,
  Trash2,
  FileText,
  Mail,
  ArrowRight,
  Pencil,
  RefreshCw,
  X,
  Download,
  Eye,
  Link2,
  ScrollText,
  LayoutList,
  Filter,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUpDown,
  Upload,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import {
  TRACK_LABEL,
  appJdText,
  appJobUrl,
  normalizeCvRationale,
  type JobApplication,
  type TrackStatus,
} from "@/types";
import {
  deadlineUrgencyClass,
  formatDeadlineLabel,
  getDeadlineUrgency,
  normalizeDeadline,
} from "@/lib/deadline";
import {
  SORT_FIELD_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TRACK_STATUSES,
  computeApplicationStats,
  filterApplicationsByStatus,
  formatApplicationUpdatedAt,
  normalizeTrackStatus,
  sortApplications,
  type SortDir,
  type SortField,
  type StatusFilter,
} from "@/lib/application-stats";
import { CV_SHEET_CSS } from "@/lib/cv-template";
import {
  exportHtmlPdf,
  exportHtmlWord,
  interviewQaToHtml,
  wrapCoverLetterAsDoc,
} from "@/lib/export";
import {
  UPLOADED_CV_ACCEPT,
  downloadUploadedCv,
  getUploadedCvFile,
  hasUploadedCv,
  normalizeUploadedCv,
  saveUploadedCvFile,
  wrapUploadedCvAsHtml,
} from "@/lib/uploaded-cv";
import { extractPdfStringsHeuristic } from "@/lib/extract-pdf-text";

const STATUS_STYLE: Record<TrackStatus, string> = {
  preparing: "bg-slate-100 text-slate-700 border-slate-200/80",
  applied: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  interview: "bg-violet-50 text-violet-800 border-violet-200/80",
};

const STATUS_DOT: Record<TrackStatus, string> = {
  preparing: "bg-slate-400",
  applied: "bg-emerald-500",
  interview: "bg-violet-500",
};

function BoardLoadingSkeleton() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <div className="mb-6 h-24 animate-pulse rounded-3xl bg-slate-200/70" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-2xl bg-slate-200/60"
          />
        ))}
      </div>
      <div className="mb-3 h-8 w-64 animate-pulse rounded-full bg-slate-200/60" />
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="h-3 w-full max-w-xl animate-pulse rounded bg-slate-200/80" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-50 px-4 py-4 last:border-0"
          >
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200/70" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
            <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        {syncStatusLabel()}
      </p>
    </section>
  );
}

function syncStatusLabel() {
  return "正在从云端同步求职进度…";
}

type PreviewKind = "cv" | "cover" | "interview" | "jd";

function UploadedCvViewer({ app }: { app: JobApplication }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mime, setMime] = useState("");

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    void (async () => {
      const rec = await getUploadedCvFile(app.id);
      if (cancelled || !rec?.blob) return;
      url = URL.createObjectURL(rec.blob);
      setBlobUrl(url);
      setMime(rec.mimeType || app.uploadedCv?.mimeType || "");
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [app.id, app.uploadedCv?.mimeType]);

  if (blobUrl && /pdf/i.test(mime)) {
    return (
      <iframe
        title="上传 CV 预览"
        src={blobUrl}
        className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
      />
    );
  }

  const html = wrapUploadedCvAsHtml(app.uploadedCv);
  if (html) {
    return (
      <div
        className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200/60 bg-white p-4 text-sm leading-relaxed text-slate-800 [&_p]:mb-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <p className="text-sm text-slate-500">暂无已上传 CV 内容可预览。</p>
  );
}

function sortDirHint(field: SortField, dir: SortDir): string {
  if (field === "deadline") {
    return dir === "asc" ? "最近截止优先" : "最远截止优先";
  }
  return dir === "desc" ? "最新更新优先" : "最早更新优先";
}

export function ApplicationsTracker() {
  const {
    applications,
    updateApplication,
    removeApplication,
    selectApp,
    setTab,
    hydrated,
    setDraftJd,
    setDraftJobUrl,
    setDraftCompany,
    setDraftTitle,
    setDraftDeadline,
    setTailoredResume,
    setCoverLetter,
    setInterviewQA,
    setRationale,
    setGenerationSourceKey,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  /** 默认：最近截止优先；无截止日期的沉底 */
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAppIdRef = useRef<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState("");
  const [preview, setPreview] = useState<{
    app: JobApplication;
    kind: PreviewKind;
  } | null>(null);

  const { total, counts } = useMemo(
    () => computeApplicationStats(applications),
    [applications]
  );

  const filtered = useMemo(() => {
    const list = filterApplicationsByStatus(applications, statusFilter);
    return sortApplications(list, sortField, sortDir);
  }, [applications, statusFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    // 切入字段时用该字段最常用方向
    setSortDir(field === "deadline" ? "asc" : "desc");
  }

  function openInResume(id: string, regenerate = false) {
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    selectApp(id);
    const jd = appJdText(app);
    const url = appJobUrl(app);
    setDraftJd(jd);
    setDraftJobUrl(url);
    setDraftCompany(app.company || "");
    setDraftTitle(app.title || "");
    setDraftDeadline(normalizeDeadline(app.deadline) || "");
    const uploadedHtml = wrapUploadedCvAsHtml(app.uploadedCv);
    setTailoredResume(
      regenerate ? uploadedHtml : app.cvHtml || uploadedHtml || ""
    );
    setCoverLetter(regenerate ? "" : app.coverLetter || "");
    setInterviewQA(regenerate ? [] : app.interviewQA || []);
    setRationale(
      regenerate
        ? { added: [], removed: [] }
        : normalizeCvRationale(app.rationale ?? app.rationaleList)
    );
    setGenerationSourceKey(
      regenerate ? null : `${url.trim()}\n${jd.trim()}`
    );
    setTab("resume");
  }

  function startUploadCv(id: string) {
    uploadAppIdRef.current = id;
    fileInputRef.current?.click();
  }

  function onMaterialsCvClick(app: JobApplication) {
    if (uploadingId === app.id) return;
    if (hasUploadedCv(app.uploadedCv) || app.cvHtml) {
      setPreview({ app, kind: "cv" });
      return;
    }
    startUploadCv(app.id);
  }

  function isHardUploadError(message: string) {
    return /过大|为空|不支持|请选择/.test(message);
  }

  async function handleUploadFile(file: File) {
    const appId = uploadAppIdRef.current;
    uploadAppIdRef.current = null;
    if (!appId) return;
    setUploadingId(appId);
    setUploadHint("");
    try {
      if (file.size <= 0) throw new Error("文件为空");
      if (file.size > 8 * 1024 * 1024) {
        throw new Error("文件过大，请上传不超过 8MB 的简历");
      }
      const ext = (file.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
      if (
        ![".pdf", ".docx", ".doc", ".txt", ".md", ".markdown"].includes(ext)
      ) {
        throw new Error(
          "暂不支持该格式，请上传 .pdf / .docx / .txt / .md"
        );
      }

      try {
        await saveUploadedCvFile({
          id: appId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          blob: file,
        });
      } catch {
        /* 本机缓存失败不阻断绑定 */
      }

      let text = "";
      let html = "";
      let warning = "";
      let format = "";
      let mimeType = file.type;
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/parse-resume", {
          method: "POST",
          body: form,
        });
        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (res.status === 400 && data.error) {
          throw new Error(String(data.error));
        }
        text = String(data.text || "");
        html = String(data.html || "");
        warning = String(data.warning || "");
        format = String(data.format || "");
        mimeType = String(data.mimeType || file.type);
        if (!text && !warning) {
          warning = "未能提取文字，文件已绑定到该岗位，可预览或下载原件。";
        }
      } catch (e) {
        if (e instanceof Error && isHardUploadError(e.message)) throw e;
        warning =
          e instanceof Error
            ? `${e.message.replace(/^简历解析失败[:：]\s*/, "")} 文件已绑定，可预览或下载原件。`
            : "文本解析不完整，文件已绑定到该岗位。";
      }

      if (!text && ext === ".pdf") {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          text = extractPdfStringsHeuristic(bytes);
          if (text) warning = "";
        } catch {
          /* keep prior warning */
        }
      }

      const att = normalizeUploadedCv({
        filename: file.name,
        format,
        mimeType,
        uploadedAt: new Date().toISOString(),
        text,
        html,
        chars: text.length,
      });
      if (!att) throw new Error("未能保存上传的 CV");
      updateApplication(appId, { uploadedCv: att });
      setPreview((prev) =>
        prev && prev.app.id === appId
          ? { ...prev, app: { ...prev.app, uploadedCv: att } }
          : prev
      );
      setUploadHint(warning || `已绑定 CV：${att.filename}`);
      setTimeout(() => setUploadHint(""), 4500);
    } catch (e) {
      setUploadHint(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDownloadUploaded(app: JobApplication) {
    try {
      await downloadUploadedCv(app.id, app.uploadedCv);
    } catch (e) {
      setUploadHint(e instanceof Error ? e.message : "下载失败");
    }
  }

  function exportPreviewPdf() {
    if (!preview) return;
    const app =
      applications.find((a) => a.id === preview.app.id) || preview.app;
    const { kind } = preview;
    const label = `${app.company || "export"}-${kind}`;
    if (kind === "cv") {
      exportHtmlPdf(app.cvHtml || "", label);
    } else if (kind === "cover") {
      exportHtmlPdf(wrapCoverLetterAsDoc(app.coverLetter || ""), label);
    } else {
      exportHtmlPdf(interviewQaToHtml(app.interviewQA || []), label);
    }
  }

  function exportPreviewWord() {
    if (!preview) return;
    const app =
      applications.find((a) => a.id === preview.app.id) || preview.app;
    const { kind } = preview;
    const base = `${app.company || "export"}-${app.title || kind}`;
    if (kind === "cv") {
      exportHtmlWord(app.cvHtml || "", `${base}-CV`);
    } else if (kind === "cover") {
      exportHtmlWord(wrapCoverLetterAsDoc(app.coverLetter || ""), `${base}-CL`);
    } else {
      exportHtmlWord(
        interviewQaToHtml(app.interviewQA || []),
        `${base}-面试题`
      );
    }
  }

  /* ——— 云端加载中：避免先闪「暂无记录」 ——— */
  if (!hydrated && applications.length === 0) {
    return <BoardLoadingSkeleton />;
  }

  /* ——— 全局空状态 ——— */
  if (applications.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          emoji="📊"
          title="求职进度"
          description="表格视图 · 按岗位对齐材料与进度 · 暂无记录"
          accent="indigo"
        />
        <div className="rounded-3xl border border-dashed border-slate-300/70 bg-white/60 px-8 py-16 text-center shadow-glass backdrop-blur-xl">
          <SquareKanban className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-4 font-display text-xl text-slate-900">
            求职进度还是空的
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm tracking-wide text-slate-600">
            在「专属简历」粘贴 JD / 链接后即可「导入求职进度」，或生成材料后「保存
            CV」。
          </p>
          <button
            type="button"
            onClick={() => setTab("resume")}
            className="soft-btn-primary mt-6 px-5"
          >
            去专属简历
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <PageHeader
        emoji="📊"
        title="求职进度"
        description={`表格视图 · 按岗位对齐材料与进度 · 共 ${total} 个`}
        accent="indigo"
        actions={
          <button
            type="button"
            onClick={() => setTab("resume")}
            className="soft-btn-ghost"
          >
            新增 / 生成材料
            <ArrowRight className="h-4 w-4" />
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={UPLOADED_CV_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleUploadFile(file);
        }}
      />
      {uploadHint && (
        <p
          className={`mb-3 rounded-2xl border px-4 py-2 text-sm ${
            isHardUploadError(uploadHint)
              ? "border-rose-100 bg-rose-50/80 text-rose-700"
              : /未能|不完整|扫描|问题|已绑定，/.test(uploadHint) &&
                  !/^已绑定 CV：/.test(uploadHint)
                ? "border-amber-100 bg-amber-50/80 text-amber-900"
                : "border-emerald-100 bg-emerald-50/80 text-emerald-800"
          }`}
        >
          {uploadHint}
        </p>
      )}

      {/* ——— Metrics Cards ——— */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            statusFilter === "all"
              ? "border-indigo-300 bg-indigo-50/90 shadow-glass"
              : "border-slate-200/60 bg-white/70 hover:border-slate-300"
          }`}
        >
          <p className="text-[11px] font-medium tracking-wide text-slate-500">
            总数 Total
          </p>
          <p className="mt-1 font-display text-2xl tabular-nums text-slate-900">
            {total}
          </p>
        </button>
        {TRACK_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              statusFilter === s
                ? "border-indigo-300 bg-indigo-50/90 shadow-glass"
                : "border-slate-200/60 bg-white/70 hover:border-slate-300"
            }`}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-500">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`}
              />
              {TRACK_LABEL[s]}
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums text-slate-900">
              {counts[s]}
            </p>
          </button>
        ))}
      </div>

      {/* ——— Status Filter + Sort ——— */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            状态筛选
          </span>
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const active = statusFilter === opt.id;
            const count =
              opt.id === "all" ? total : counts[opt.id as TrackStatus];
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-indigo-400 bg-indigo-600 text-white"
                    : "border-slate-200/80 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {opt.label}
                <span
                  className={`ml-1.5 tabular-nums ${
                    active ? "text-indigo-100" : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            排序
          </span>
          <div className="inline-flex rounded-full border border-slate-200/80 bg-white/80 p-0.5">
            {SORT_FIELD_OPTIONS.map((opt) => {
              const active = sortField === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleSort(opt.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  title={
                    active
                      ? `当前：${sortDirHint(opt.id, sortDir)}（再点切换升降序）`
                      : `按${opt.label}排序`
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() =>
              setSortDir((d) => (d === "asc" ? "desc" : "asc"))
            }
            className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            title="切换升序 / 降序"
            aria-label="切换升降序"
          >
            {sortDir === "asc" ? (
              <ArrowUpAZ className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            )}
            {sortDir === "asc" ? "升序" : "降序"}
            <span className="hidden text-slate-400 sm:inline">
              · {sortDirHint(sortField, sortDir)}
            </span>
          </button>
        </div>
      </div>

      {/* ——— Linear Table ——— */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  公司名称
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  岗位
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <button
                    type="button"
                    onClick={() => toggleSort("deadline")}
                    className={`inline-flex items-center gap-1 transition hover:text-slate-800 ${
                      sortField === "deadline" ? "text-slate-900" : ""
                    }`}
                    title={sortDirHint("deadline", sortField === "deadline" ? sortDir : "asc")}
                  >
                    截止日期
                    {sortField === "deadline" ? (
                      sortDir === "asc" ? (
                        <ArrowUpAZ className="h-3 w-3" />
                      ) : (
                        <ArrowDownAZ className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  当前状态
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  材料
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <button
                    type="button"
                    onClick={() => toggleSort("updated")}
                    className={`inline-flex items-center gap-1 transition hover:text-slate-800 ${
                      sortField === "updated" ? "text-slate-900" : ""
                    }`}
                    title={sortDirHint("updated", sortField === "updated" ? sortDir : "desc")}
                  >
                    更新时间
                    {sortField === "updated" ? (
                      sortDir === "asc" ? (
                        <ArrowUpAZ className="h-3 w-3" />
                      ) : (
                        <ArrowDownAZ className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <LayoutList className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      当前筛选下暂无记录
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      试试切换到「全部」，或在其他状态下新增岗位
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className="mt-4 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      查看全部
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const qaCount = app.interviewQA?.length || 0;
                  const jdFull = appJdText(app);
                  const urlFull = appJobUrl(app);
                  const status = normalizeTrackStatus(app.trackStatus);
                  return (
                    <tr
                      key={app.id}
                      className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3.5 align-middle">
                        <p className="max-w-[200px] truncate font-semibold text-slate-900">
                          {app.company || "未知公司"}
                        </p>
                        <button
                          type="button"
                          disabled={!jdFull && !urlFull}
                          onClick={() => setPreview({ app, kind: "jd" })}
                          className={`mt-1 inline-flex items-center gap-1 text-[10px] ${
                            jdFull || urlFull
                              ? "text-slate-400 hover:text-slate-700"
                              : "cursor-not-allowed text-slate-300"
                          }`}
                          title="查看完整 JD 与链接"
                        >
                          <ScrollText className="h-3 w-3" />
                          JD / 链接
                        </button>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="max-w-[220px] truncate text-sm text-slate-700">
                          {app.title || "未命名岗位"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {(() => {
                          const urgency = getDeadlineUrgency(app.deadline);
                          const iso = normalizeDeadline(app.deadline);
                          const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(iso)
                            ? iso
                            : "";
                          return (
                            <input
                              type="date"
                              value={dateValue}
                              onChange={(e) =>
                                updateApplication(app.id, {
                                  deadline:
                                    normalizeDeadline(e.target.value) ||
                                    undefined,
                                })
                              }
                              className={`w-[138px] rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/25 ${
                                urgency === "none"
                                  ? "border-dashed border-slate-200 bg-transparent text-slate-400"
                                  : deadlineUrgencyClass(urgency)
                              }`}
                              aria-label="截止日期"
                              title={
                                urgency === "none"
                                  ? "设置截止日期"
                                  : formatDeadlineLabel(app.deadline)
                              }
                            />
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <select
                          value={status}
                          onChange={(e) =>
                            updateApplication(app.id, {
                              trackStatus: e.target.value as TrackStatus,
                            })
                          }
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/25 ${STATUS_STYLE[status]}`}
                          aria-label="更新求职状态"
                        >
                          {TRACK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {TRACK_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const bound = hasUploadedCv(app.uploadedCv);
                            const generated = Boolean(app.cvHtml);
                            const busy = uploadingId === app.id;
                            return (
                              <button
                                type="button"
                                onClick={() => onMaterialsCvClick(app)}
                                disabled={busy}
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                                  busy
                                    ? "border-slate-200 text-slate-400"
                                    : bound
                                      ? "border-amber-200/80 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
                                      : generated
                                        ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100"
                                        : "border-dashed border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                                }`}
                                title={
                                  bound
                                    ? `预览 ${app.uploadedCv?.filename || "已上传 CV"}，可在弹窗中替换`
                                    : generated
                                      ? "预览生成 CV，可在弹窗中上传/绑定文件"
                                      : "上传 PDF / Word 并绑定到该岗位"
                                }
                              >
                                {busy ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <FileText className="h-3 w-3" />
                                )}
                                CV
                                {!bound && !generated ? (
                                  <Upload className="h-3 w-3 opacity-70" />
                                ) : null}
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            disabled={!app.coverLetter}
                            onClick={() => setPreview({ app, kind: "cover" })}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                              app.coverLetter
                                ? "border-sky-200/80 bg-sky-50/80 text-sky-800 hover:bg-sky-100"
                                : "cursor-not-allowed border-slate-100 text-slate-300"
                            }`}
                          >
                            <Mail className="h-3 w-3" />
                            CL
                          </button>
                          <button
                            type="button"
                            disabled={!qaCount}
                            onClick={() =>
                              setPreview({ app, kind: "interview" })
                            }
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                              qaCount
                                ? "border-violet-200/80 bg-violet-50/80 text-violet-800 hover:bg-violet-100"
                                : "cursor-not-allowed border-slate-100 text-slate-300"
                            }`}
                            title="查看面试问题"
                          >
                            <Eye className="h-3 w-3" />
                            面试{qaCount > 0 ? ` · ${qaCount}` : ""}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                          {formatApplicationUpdatedAt(
                            app.updatedAt || app.createdAt
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-wrap items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => openInResume(app.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            修改
                          </button>
                          <button
                            type="button"
                            onClick={() => openInResume(app.id, true)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            重生成
                          </button>
                          <button
                            type="button"
                            onClick={() => removeApplication(app.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
            显示 {filtered.length} / {total} 条记录
            {statusFilter !== "all"
              ? ` · 筛选：${TRACK_LABEL[statusFilter]}`
              : ""}
          </div>
        )}
      </div>

      {/* ——— Preview Modal (portal to body so it centers in the viewport) ——— */}
      {preview &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
        const previewApp =
          applications.find((a) => a.id === preview.app.id) || preview.app;
        const bound = hasUploadedCv(previewApp.uploadedCv);
        return (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4"
          style={{ top: 0, left: 0, right: 0, bottom: 0, height: "100dvh" }}
          onClick={() => setPreview(null)}
          role="presentation"
        >
          <div
            className="relative max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/60 bg-white p-5 shadow-glass-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/50 pb-3">
              <div>
                <h3 className="font-display text-lg text-slate-900">
                  {preview.kind === "cv"
                    ? bound
                      ? "CV"
                      : "CV 预览"
                    : preview.kind === "cover"
                      ? "Cover Letter 预览"
                      : preview.kind === "jd"
                        ? "岗位 JD / 链接"
                        : "面试问题"}
                </h3>
                <p className="text-xs tracking-wide text-slate-500">
                  {previewApp.company} · {previewApp.title}
                  {preview.kind === "cv" && bound
                    ? ` · ${previewApp.uploadedCv?.filename}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {preview.kind === "cv" && (
                  <>
                    <button
                      type="button"
                      onClick={() => startUploadCv(previewApp.id)}
                      className="soft-btn rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-950 shadow-glass"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {bound ? "替换文件" : "上传文件"}
                    </button>
                    {bound && (
                      <button
                        type="button"
                        onClick={() => void handleDownloadUploaded(previewApp)}
                        className="soft-btn rounded-xl border border-slate-200/60 bg-white/80 px-3 py-1.5 text-xs text-slate-800 shadow-glass"
                      >
                        <Download className="h-3.5 w-3.5" />
                        下载
                      </button>
                    )}
                    {previewApp.cvHtml ? (
                      <>
                        <button
                          type="button"
                          onClick={exportPreviewPdf}
                          className="soft-btn rounded-xl border border-slate-200/60 bg-white/80 px-3 py-1.5 text-xs text-slate-800 shadow-glass"
                        >
                          <Download className="h-3.5 w-3.5" />
                          导出 PDF
                        </button>
                        <button
                          type="button"
                          onClick={exportPreviewWord}
                          className="soft-btn rounded-xl border border-indigo-200/60 bg-indigo-50/80 px-3 py-1.5 text-xs text-indigo-900 shadow-glass"
                        >
                          <Download className="h-3.5 w-3.5" />
                          导出 Word
                        </button>
                      </>
                    ) : null}
                  </>
                )}
                {preview.kind !== "jd" && preview.kind !== "cv" && (
                  <>
                    <button
                      type="button"
                      onClick={exportPreviewPdf}
                      className="soft-btn rounded-xl border border-slate-200/60 bg-white/80 px-3 py-1.5 text-xs text-slate-800 shadow-glass"
                    >
                      <Download className="h-3.5 w-3.5" />
                      导出 PDF
                    </button>
                    <button
                      type="button"
                      onClick={exportPreviewWord}
                      className="soft-btn rounded-xl border border-indigo-200/60 bg-indigo-50/80 px-3 py-1.5 text-xs text-indigo-900 shadow-glass"
                    >
                      <Download className="h-3.5 w-3.5" />
                      导出 Word
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {preview.kind === "jd" && (
              <div className="space-y-3">
                {appJobUrl(previewApp) ? (
                  <a
                    href={appJobUrl(previewApp)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 break-all text-sm text-teal-700 underline"
                  >
                    <Link2 className="h-3.5 w-3.5 shrink-0" />
                    {appJobUrl(previewApp)}
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">未保存岗位链接</p>
                )}
                <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200/40 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-800">
                  {appJdText(previewApp) || "（暂无 JD 文本）"}
                </pre>
              </div>
            )}
            {preview.kind === "cv" && (
              <div className="space-y-6">
                {bound && (
                  <div>
                    <p className="mb-2 text-[11px] font-medium text-slate-500">
                      已绑定文件
                    </p>
                    <UploadedCvViewer app={previewApp} />
                  </div>
                )}
                {previewApp.cvHtml ? (
                  <div>
                    {bound ? (
                      <p className="mb-2 text-[11px] font-medium text-slate-500">
                        生成稿
                      </p>
                    ) : null}
                    <style dangerouslySetInnerHTML={{ __html: CV_SHEET_CSS }} />
                    <div
                      className="origin-top scale-[0.72] sm:scale-90"
                      dangerouslySetInnerHTML={{
                        __html: previewApp.cvHtml || "",
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )}
            {preview.kind === "cover" && (
              <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200/40 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-800">
                {previewApp.coverLetter}
              </pre>
            )}
            {preview.kind === "interview" && (
              <ul className="space-y-3">
                {(previewApp.interviewQA || []).map((qa, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-violet-100/80 bg-violet-50/40 p-4 text-sm"
                  >
                    <p className="font-medium text-slate-900">
                      {i + 1}. {qa.question}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-700">
                      {qa.answer}
                    </p>
                    {qa.tip ? (
                      <p className="mt-2 text-xs text-violet-700">
                        Tip: {qa.tip}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        );
          })(),
          document.body
        )}
    </section>
  );
}
