import {
  TRACK_LABEL,
  type JobApplication,
  type TrackStatus,
} from "@/types";

/** 求职进度可选状态（已移除「网申中」） */
export const TRACK_STATUSES: TrackStatus[] = [
  "preparing",
  "applied",
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
