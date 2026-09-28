"use client";

import { useMemo, useState } from "react";
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
  STATUS_FILTER_OPTIONS,
  TRACK_STATUSES,
  computeApplicationStats,
  filterApplicationsByStatus,
  formatApplicationUpdatedAt,
  normalizeTrackStatus,
  type StatusFilter,
} from "@/lib/application-stats";
import { CV_SHEET_CSS } from "@/lib/cv-template";
import {
  exportHtmlPdf,
  exportHtmlWord,
  interviewQaToHtml,
  wrapCoverLetterAsDoc,
} from "@/lib/export";

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

type PreviewKind = "cv" | "cover" | "interview" | "jd";

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
    setDraftDeadline,
    setTailoredResume,
    setCoverLetter,
    setInterviewQA,
    setRationale,
    setGenerationSourceKey,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [preview, setPreview] = useState<{
    app: JobApplication;
    kind: PreviewKind;
  } | null>(null);

  const { total, counts } = useMemo(
    () => computeApplicationStats(applications),
    [applications]
  );

  const filtered = useMemo(
    () => filterApplicationsByStatus(applications, statusFilter),
    [applications, statusFilter]
  );

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
    setTailoredResume(regenerate ? "" : app.cvHtml || "");
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

  function exportPreviewPdf() {
    if (!preview) return;
    const { app, kind } = preview;
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
    const { app, kind } = preview;
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

      {/* ——— Status Filter Tabs ——— */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
                  截止日期
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  当前状态
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  材料
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  更新时间
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
                          <button
                            type="button"
                            disabled={!app.cvHtml}
                            onClick={() => setPreview({ app, kind: "cv" })}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                              app.cvHtml
                                ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100"
                                : "cursor-not-allowed border-slate-100 text-slate-300"
                            }`}
                          >
                            <FileText className="h-3 w-3" />
                            CV
                          </button>
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

      {/* ——— Preview Modal ——— */}
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
                      : preview.kind === "jd"
                        ? "岗位 JD / 链接"
                        : "面试问题"}
                </h3>
                <p className="text-xs tracking-wide text-slate-500">
                  {preview.app.company} · {preview.app.title}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {preview.kind !== "jd" && (
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
                {appJobUrl(preview.app) ? (
                  <a
                    href={appJobUrl(preview.app)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 break-all text-sm text-teal-700 underline"
                  >
                    <Link2 className="h-3.5 w-3.5 shrink-0" />
                    {appJobUrl(preview.app)}
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">未保存岗位链接</p>
                )}
                <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200/40 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-800">
                  {appJdText(preview.app) || "（暂无 JD 文本）"}
                </pre>
              </div>
            )}
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
