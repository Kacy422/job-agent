"use client";

import { useState } from "react";
import {
  LayoutGrid,
  Trash2,
  FileText,
  Mail,
  ArrowRight,
  Pencil,
  RefreshCw,
  X,
  Download,
  Eye,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import {
  TRACK_LABEL,
  normalizeCvRationale,
  type JobApplication,
  type TrackStatus,
} from "@/types";
import { CV_SHEET_CSS } from "@/lib/cv-template";
import {
  exportHtmlPdf,
  exportHtmlWord,
  interviewQaToHtml,
  wrapPlainAsDoc,
} from "@/lib/export";

const STATUSES: TrackStatus[] = [
  "preparing",
  "applying",
  "applied",
  "interview",
];

const STATUS_STYLE: Record<TrackStatus, string> = {
  preparing: "bg-slate-100 text-slate-700 border-slate-200",
  applying: "bg-amber-50 text-amber-800 border-amber-200",
  applied: "bg-emerald-50 text-emerald-800 border-emerald-200",
  interview: "bg-violet-50 text-violet-800 border-violet-200",
};

type PreviewKind = "cv" | "cover" | "interview";

export function ApplicationsTracker() {
  const {
    applications,
    updateApplication,
    removeApplication,
    selectApp,
    setTab,
    setDraftJd,
    setDraftJobUrl,
    setDraftCompany,
    setDraftTitle,
    setTailoredResume,
    setCoverLetter,
    setInterviewQA,
    setRationale,
    setGenerationSourceKey,
  } = useApp();

  const [preview, setPreview] = useState<{
    app: JobApplication;
    kind: PreviewKind;
  } | null>(null);

  function openInResume(id: string, regenerate = false) {
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    selectApp(id);
    const jd = app.jd || "";
    const url = app.applyUrl || "";
    setDraftJd(jd);
    setDraftJobUrl(url);
    setDraftCompany(app.company || "");
    setDraftTitle(app.title || "");
    setTailoredResume(regenerate ? "" : app.cvHtml || "");
    setCoverLetter(regenerate ? "" : app.coverLetter || "");
    setInterviewQA(regenerate ? [] : app.interviewQA || []);
    setRationale(
      regenerate
        ? { added: [], removed: [] }
        : normalizeCvRationale(app.rationale ?? app.rationaleList)
    );
    // 绑定指纹，避免进入专属简历时被 workspace 清空逻辑误清
    setGenerationSourceKey(
      regenerate ? null : `${url.trim()}\n${jd.trim()}`
    );
    setTab("resume");
  }

  function exportPreviewPdf() {
    if (!preview) return;
    const { app, kind } = preview;
    const label = `${app.company || "export"}-${kind}`;
    if (kind === "cv") {
      exportHtmlPdf(app.cvHtml || "", label);
    } else if (kind === "cover") {
      exportHtmlPdf(wrapPlainAsDoc(app.coverLetter || ""), label);
    } else {
      exportHtmlPdf(
        interviewQaToHtml(app.interviewQA || []),
        label
      );
    }
  }

  function exportPreviewWord() {
    if (!preview) return;
    const { app, kind } = preview;
    const base = `${app.company || "export"}-${app.title || kind}`;
    if (kind === "cv") {
      exportHtmlWord(app.cvHtml || "", `${base}-CV`);
    } else if (kind === "cover") {
      exportHtmlWord(wrapPlainAsDoc(app.coverLetter || ""), `${base}-CL`);
    } else {
      exportHtmlWord(
        interviewQaToHtml(app.interviewQA || []),
        `${base}-面试题`
      );
    }
  }

  if (applications.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          emoji="📊"
          title="求职总结"
          description="表格视图 · 按岗位对齐材料与进度 · 暂无记录"
          accent="indigo"
        />
        <div className="rounded-3xl border border-dashed border-slate-300/70 bg-white/60 px-8 py-16 text-center shadow-glass backdrop-blur-xl">
          <LayoutGrid className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-4 font-display text-xl text-slate-900">
            求职总结还是空的
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm tracking-wide text-slate-600">
            在「专属简历」生成材料后，可一键追加到此处归档。
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
        title="求职总结"
        description={`表格视图 · 按岗位对齐材料与进度 · 共 ${applications.length} 个`}
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

      <div className="glass-panel overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/50 bg-slate-50/50 text-[11px] font-semibold tracking-wide text-slate-500">
              <th className="px-4 py-3">公司 / 岗位</th>
              <th className="px-4 py-3">初级求职材料</th>
              <th className="px-4 py-3">网申进度</th>
              <th className="px-4 py-3">面试备战</th>
              <th className="px-4 py-3 text-right">快捷操作</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const qaCount = app.interviewQA?.length || 0;
              return (
                <tr
                  key={app.id}
                  className="border-b border-slate-100 align-middle last:border-0 hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="soft-tag max-w-full border-amber-200/60 bg-amber-50/90 px-2.5 py-1 text-sm font-semibold text-amber-800 shadow-glass">
                        <span className="truncate">
                          {app.company || "未知公司"}
                        </span>
                      </span>
                      <span className="soft-tag max-w-full border-slate-200/70 bg-slate-100/90 px-2 py-0.5 text-xs font-medium text-slate-700 shadow-glass">
                        <span className="truncate">
                          {app.title || "未命名岗位"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={!app.cvHtml}
                        onClick={() => setPreview({ app, kind: "cv" })}
                        className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs transition-all hover:scale-[1.01] ${
                          app.cvHtml
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <FileText className="h-3 w-3" />
                        CV
                      </button>
                      <button
                        type="button"
                        disabled={!app.coverLetter}
                        onClick={() => setPreview({ app, kind: "cover" })}
                        className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs transition-all hover:scale-[1.01] ${
                          app.coverLetter
                            ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                            : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <Mail className="h-3 w-3" />
                        CL
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={app.trackStatus}
                      onChange={(e) =>
                        updateApplication(app.id, {
                          trackStatus: e.target.value as TrackStatus,
                        })
                      }
                      className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500/30 ${STATUS_STYLE[app.trackStatus]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {TRACK_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      disabled={!qaCount}
                      onClick={() => setPreview({ app, kind: "interview" })}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs transition-all hover:scale-[1.01] ${
                        qaCount
                          ? "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
                          : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                      }`}
                      title="查看面试问题"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      面试问题
                      {qaCount > 0 ? ` · ${qaCount}` : ""}
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openInResume(app.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        修改
                      </button>
                      <button
                        type="button"
                        onClick={() => openInResume(app.id, true)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        重生成
                      </button>
                      <button
                        type="button"
                        onClick={() => removeApplication(app.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setPreview(null)}
          role="presentation"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-white/60 bg-white/90 p-5 shadow-glass-lg backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/50 pb-3">
              <div>
                <h3 className="font-display text-lg text-slate-900">
                  {preview.kind === "cv"
                    ? "CV 预览"
                    : preview.kind === "cover"
                      ? "Cover Letter 预览"
                      : "面试问题"}
                </h3>
                <p className="text-xs tracking-wide text-slate-500">
                  {preview.app.company} · {preview.app.title}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {preview.kind === "cv" && (
              <>
                <style dangerouslySetInnerHTML={{ __html: CV_SHEET_CSS }} />
                <div
                  className="origin-top scale-[0.72] sm:scale-90"
                  dangerouslySetInnerHTML={{
                    __html: preview.app.cvHtml || "",
                  }}
                />
              </>
            )}
            {preview.kind === "cover" && (
              <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200/40 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-800">
                {preview.app.coverLetter}
              </pre>
            )}
            {preview.kind === "interview" && (
              <ul className="space-y-3">
                {(preview.app.interviewQA || []).map((qa, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-violet-100/80 bg-violet-50/40 p-4 text-sm"
                  >
                    <p className="font-semibold text-slate-900">
                      Q{i + 1}. {qa.question}
                    </p>
                    {qa.tip && (
                      <p className="mt-1 text-xs text-amber-800">💡 {qa.tip}</p>
                    )}
                    <p className="mt-2 whitespace-pre-wrap text-slate-700">
                      {qa.answer}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
