"use client";

import type { ReactNode } from "react";

type Accent = "indigo" | "teal" | "violet" | "amber";

const ACCENT: Record<
  Accent,
  { bar: string; glow: string; step: string }
> = {
  indigo: {
    bar: "border-indigo-400/80",
    glow: "from-indigo-50/80 via-white/70 to-slate-50/40",
    step: "text-indigo-700",
  },
  teal: {
    bar: "border-teal-400/80",
    glow: "from-teal-50/80 via-white/70 to-slate-50/40",
    step: "text-teal-700",
  },
  violet: {
    bar: "border-violet-400/80",
    glow: "from-violet-50/80 via-white/70 to-slate-50/40",
    step: "text-violet-700",
  },
  amber: {
    bar: "border-amber-400/80",
    glow: "from-amber-50/80 via-white/70 to-slate-50/40",
    step: "text-amber-800",
  },
};

interface PageHeaderProps {
  emoji: string;
  step?: string;
  title: string;
  description: string;
  accent?: Accent;
  actions?: ReactNode;
}

/** Soft-Glass 页面大标题：左侧彩条 + 毛玻璃渐变 */
export function PageHeader({
  emoji,
  step,
  title,
  description,
  accent = "indigo",
  actions,
}: PageHeaderProps) {
  const a = ACCENT[accent];
  return (
    <div className="mb-7 flex flex-wrap items-stretch justify-between gap-4">
      <div
        className={`min-w-0 flex-1 rounded-3xl rounded-l-lg border border-white/60 border-l-4 ${a.bar} bg-gradient-to-br ${a.glow} p-5 shadow-glass backdrop-blur-xl`}
      >
        {step && (
          <p className={`mb-1.5 text-xs font-medium tracking-wide ${a.step}`}>
            {step}
          </p>
        )}
        <h2 className="flex items-center gap-2.5 font-display text-2xl text-slate-900 sm:text-3xl">
          <span className="text-[1.35em] leading-none" aria-hidden>
            {emoji}
          </span>
          <span>{title}</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed tracking-wide text-slate-600">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
