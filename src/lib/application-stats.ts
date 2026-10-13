import {
  TRACK_LABEL,
  type JobApplication,
  type TrackStatus,
} from "@/types";
import { normalizeDeadline } from "@/lib/deadline";

/** 求职进度可选状态（顺序即看板流转） */
export const TRACK_STATUSES: TrackStatus[] = [
  "preparing",
  "applied",
  "testReceived",
  "testCompleted",
  "interview",
];

export type StatusFilter = "all" | TrackStatus;

export type StatusCounts = Record<TrackStatus, number>;

export const STATUS_FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "全部" },
  ...TRACK_STATUSES.map((s) => ({
    id: s as StatusFilter,
    label: TRACK_LABEL[s],
  })),
];

/** 排序字段：截止日期 | 更新时间 | 公司首字母 */
export type SortField = "deadline" | "updated" | "alpha";
export type SortDir = "asc" | "desc";

export const SORT_FIELD_OPTIONS: { id: SortField; label: string }[] = [
  { id: "deadline", label: "截止日期" },
  { id: "updated", label: "更新时间" },
  { id: "alpha", label: "首字母" },
];

/**
 * 规范化 trackStatus。
 * 旧数据 "applying"（网申中）平滑归入 "preparing"（准备中）。
 */
export function normalizeTrackStatus(
  status: string | undefined | null
): TrackStatus {
  if (status === "applying") return "preparing";
  if (
    status === "preparing" ||
    status === "applied" ||
    status === "testReceived" ||
    status === "testCompleted" ||
    status === "interview"
  ) {
    return status;
  }
  return "preparing";
}

/** 统计各状态数量 + 总数 */
export function computeApplicationStats(apps: JobApplication[]): {
  total: number;
  counts: StatusCounts;
} {
  const counts: StatusCounts = {
    preparing: 0,
    applied: 0,
    testReceived: 0,
    testCompleted: 0,
    interview: 0,
  };
  for (const app of apps) {
    counts[normalizeTrackStatus(app.trackStatus)] += 1;
  }
  return { total: apps.length, counts };
}

/** 按状态筛选列表（all = 不过滤） */
export function filterApplicationsByStatus(
  apps: JobApplication[],
  filter: StatusFilter
): JobApplication[] {
  if (filter === "all") return apps;
  return apps.filter(
    (a) => normalizeTrackStatus(a.trackStatus) === filter
  );
}

function deadlineSortKey(deadline: string | undefined): number | null {
  const n = normalizeDeadline(deadline);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return null;
  const t = Date.parse(`${n}T00:00:00`);
  return Number.isNaN(t) ? null : t;
}

function updatedSortKey(app: JobApplication): number {
  const t = Date.parse(app.updatedAt || app.createdAt || "");
  return Number.isNaN(t) ? 0 : t;
}

function alphaSortKey(app: JobApplication): string {
  return String(app.company || app.title || "")
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9\u4e00-\u9fff]+/, "");
}

/**
 * 排序：
 * - deadline：无日期沉底；asc = 最近截止优先
 * - updated：desc = 最新更新优先
 * - alpha：公司名首字母 A→Z / Z→A
 */
export function sortApplications(
  apps: JobApplication[],
  field: SortField,
  dir: SortDir
): JobApplication[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...apps].sort((a, b) => {
    if (field === "deadline") {
      const ka = deadlineSortKey(a.deadline);
      const kb = deadlineSortKey(b.deadline);
      if (ka == null && kb == null) {
        return updatedSortKey(b) - updatedSortKey(a);
      }
      if (ka == null) return 1;
      if (kb == null) return -1;
      if (ka !== kb) return (ka - kb) * mul;
      return updatedSortKey(b) - updatedSortKey(a);
    }

    if (field === "alpha") {
      const ka = alphaSortKey(a);
      const kb = alphaSortKey(b);
      if (ka !== kb) {
        return ka.localeCompare(kb, "en", { sensitivity: "base" }) * mul;
      }
      const ta = String(a.title || "")
        .trim()
        .toLowerCase();
      const tb = String(b.title || "")
        .trim()
        .toLowerCase();
      if (ta !== tb) {
        return ta.localeCompare(tb, "en", { sensitivity: "base" }) * mul;
      }
      return updatedSortKey(b) - updatedSortKey(a);
    }

    const ka = updatedSortKey(a);
    const kb = updatedSortKey(b);
    if (ka !== kb) return (ka - kb) * mul;
    return 0;
  });
}

export function formatApplicationUpdatedAt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
