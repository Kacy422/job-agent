"use client";

import {
  Building2,
  MapPin,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Trash2,
} from "lucide-react";
import { PIPELINE_LABEL, type Job, type PipelineStatus } from "@/types";

const PIPELINE_STYLE: Record<PipelineStatus, string> = {
  added: "bg-slate-100 text-slate-700",
  scraped: "bg-sky-100 text-sky-800",
  matched: "bg-indigo-100 text-indigo-800",
  resume_ready: "bg-violet-100 text-violet-800",
  apply_ready: "bg-fuchsia-100 text-fuchsia-900",
  filling: "bg-amber-100 text-amber-900",
  filled: "bg-orange-100 text-orange-900",
  submitted: "bg-teal-100 text-teal-800",
  interview: "bg-cyan-100 text-cyan-900",
  offer: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

function scoreColor(score?: number) {
  if (score == null) return "text-slate-500";
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-teal-600";
  if (score >= 55) return "text-amber-600";
  return "text-rose-600";
}

interface Props {
  job: Job;
  selected?: boolean;
  onSelect?: () => void;
  onPipelineChange?: (status: PipelineStatus) => void;
  onRemove?: () => void;
  compact?: boolean;
}

export function JobCard({
  job,
  selected,
  onSelect,
  onPipelineChange,
  onRemove,
  compact,
}: Props) {
  return (
    <article
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft ${
        selected
          ? "border-teal-500 ring-2 ring-teal-500/20"
          : "border-slate-200/90"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg text-slate-900">
            {job.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {job.company}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location || "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" />
              {job.salary || "面议"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`font-display text-2xl font-semibold ${scoreColor(job.matchScore)}`}
          >
            {job.matchScore != null ? `${job.matchScore}%` : "—"}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            匹配度
          </p>
        </div>
      </div>

      {!compact && (
        <>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {job.description}
          </p>

          {job.keywords && job.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.keywords.slice(0, 6).map((k) => (
                <span
                  key={k}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          {job.matchGaps && job.matchGaps.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="mb-1 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                匹配短板
              </div>
              <ul className="list-inside list-disc space-y-0.5 text-amber-800/90">
                {job.matchGaps.slice(0, 3).map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {job.matchStrengths && job.matchStrengths.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.matchStrengths.slice(0, 3).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {s}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-lg px-2 py-1 text-xs font-medium ${PIPELINE_STYLE[job.pipelineStatus]}`}
        >
          {PIPELINE_LABEL[job.pipelineStatus]}
        </span>
        {onPipelineChange && (
          <select
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none focus:border-teal-500"
            value={job.pipelineStatus}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              onPipelineChange(e.target.value as PipelineStatus)
            }
          >
            {(Object.keys(PIPELINE_LABEL) as PipelineStatus[]).map((s) => (
              <option key={s} value={s}>
                {PIPELINE_LABEL[s]}
              </option>
            ))}
          </select>
        )}
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"
          >
            <Link2 className="h-3 w-3" />
            原链接
          </a>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3 w-3" />
            删除
          </button>
        )}
        {!onRemove && (
          <span className="ml-auto text-xs text-slate-400">{job.source}</span>
        )}
      </div>
    </article>
  );
}
