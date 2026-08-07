"use client";

import { useEffect, useRef, useState } from "react";
import {
  UserRound,
  FileText,
  Bot,
  Sparkles,
  SquareKanban,
} from "lucide-react";
import { useApp, type TabId } from "@/context/AppContext";

const TABS: { id: TabId; label: string; icon: typeof SquareKanban }[] = [
  { id: "board", label: "求职进度", icon: SquareKanban },
  { id: "profile", label: "人物画像", icon: UserRound },
  { id: "resume", label: "专属简历", icon: FileText },
  { id: "apply", label: "自动网申", icon: Bot },
];

export function Navbar() {
  const { tab, setTab, applications, syncStatus, syncError } = useApp();
  const activeCount = applications.filter(
    (a) => a.trackStatus !== "applied"
  ).length;

  const [flashSaved, setFlashSaved] = useState(false);
  const prevStatus = useRef(syncStatus);

  useEffect(() => {
    if (
      (prevStatus.current === "saving" || prevStatus.current === "loading") &&
      syncStatus === "synced"
    ) {
      setFlashSaved(true);
      const t = setTimeout(() => setFlashSaved(false), 2200);
      return () => clearTimeout(t);
    }
    prevStatus.current = syncStatus;
  }, [syncStatus]);

  const syncLabel =
    syncStatus === "loading"
      ? "云端加载中…"
      : syncStatus === "saving"
        ? "正在保存到云端…"
        : flashSaved || syncStatus === "synced"
          ? flashSaved
            ? "云端已保存"
            : "云端已同步"
          : syncStatus === "offline"
            ? "Redis 未连接"
            : syncStatus === "error"
              ? "云端同步失败"
              : "";

  const syncClass =
    syncStatus === "synced" || flashSaved
      ? "text-emerald-600"
      : syncStatus === "error"
        ? "text-rose-600"
        : syncStatus === "offline"
          ? "text-amber-600"
          : "text-slate-400";

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/60 shadow-glass backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-teal-300 shadow-glass">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl tracking-tight text-slate-900">
              JobAgent
            </p>
            <p className="text-xs tracking-wide text-slate-500">
              人物画像 · 专属简历 · 求职进度
              {applications.length > 0
                ? ` · ${applications.length} 个岗位`
                : ""}
              {activeCount > 0 ? ` · ${activeCount} 进行中` : ""}
              {syncLabel ? (
                <span
                  className={`ml-2 font-medium ${syncClass}`}
                  title={syncError || syncLabel}
                >
                  · {syncLabel}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1 rounded-3xl border border-white/60 bg-white/70 p-1.5 shadow-glass backdrop-blur-xl">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.01] ${
                  active
                    ? "bg-slate-900 text-white shadow-glass"
                    : "text-slate-600 hover:bg-white/90 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
