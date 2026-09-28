/**
 * Application deadline helpers — normalize, heuristic extract, display urgency.
 */

/** Urgency for UI highlighting */
export type DeadlineUrgency = "none" | "ok" | "soon" | "today" | "overdue";

/** Normalize free-text deadline to YYYY-MM-DD when possible; else trimmed original or "" */
export function normalizeDeadline(raw: string | undefined | null): string {
  const s = String(raw || "").trim();
  if (!s) return "";

  // Already ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO datetime → date
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (iso) return iso[1];

  // YYYY/MM/DD or YYYY.MM.DD
  let m = s.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY (prefer day-first for HK/UK)
  m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    // If first > 12, clearly D/M/Y; if second > 12, clearly M/D/Y
    if (d > 12) {
      return `${m[3]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    if (mo > 12) {
      return `${m[3]}-${String(d).padStart(2, "0")}-${String(mo).padStart(2, "0")}`;
    }
    // Ambiguous → assume D/M/Y (HK)
    return `${m[3]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // "30 Sep 2026" / "Sep 30, 2026"
  const months: Record<string, string> = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };
  m = s.match(
    /(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i
  );
  if (m) {
    const mo = months[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${mo}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(
    /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (m) {
    const mo = months[m[1].toLowerCase()];
    if (mo) return `${m[3]}-${mo}-${m[2].padStart(2, "0")}`;
  }

  return s.slice(0, 40);
}

/** Heuristic extract deadline string from JD text */
export function extractDeadlineFromText(text: string): string {
  const t = String(text || "");
  if (!t.trim()) return "";

  const patterns = [
    /(?:application\s+)?deadline\s*[:：]?\s*([^\n.;]{4,40})/i,
    /(?:closing|apply by|applications?\s+close)\s*[:：]?\s*([^\n.;]{4,40})/i,
    /截止日期\s*[:：]?\s*([^\n。；]{4,40})/,
    /截止(?:日期|时间)?\s*[:：]?\s*([^\n。；]{4,40})/,
    /(?:请于|于)\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2})\s*(?:前|之前)?(?:申请|提交)/,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      const n = normalizeDeadline(m[1]);
      if (n) return n;
    }
  }
  return "";
}

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDeadlineDate(deadline: string): Date | null {
  const n = normalizeDeadline(deadline);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) return null;
  const [y, m, d] = n.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/** Days until deadline (0 = today). null if unparseable. */
export function daysUntilDeadline(deadline: string | undefined | null): number | null {
  const dt = parseDeadlineDate(String(deadline || ""));
  if (!dt) return null;
  const today = startOfLocalDay();
  const target = startOfLocalDay(dt);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function getDeadlineUrgency(
  deadline: string | undefined | null
): DeadlineUrgency {
  const days = daysUntilDeadline(deadline);
  if (days == null) {
    return String(deadline || "").trim() ? "ok" : "none";
  }
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "ok";
}

export function formatDeadlineLabel(deadline: string | undefined | null): string {
  const raw = String(deadline || "").trim();
  if (!raw) return "—";
  const n = normalizeDeadline(raw);
  const days = daysUntilDeadline(n);
  if (days == null) return n || raw;
  if (days < 0) return `${n} · 已过期`;
  if (days === 0) return `${n} · 今天截止`;
  if (days === 1) return `${n} · 明天`;
  if (days <= 7) return `${n} · ${days}天后`;
  return n;
}

export function deadlineUrgencyClass(urgency: DeadlineUrgency): string {
  switch (urgency) {
    case "overdue":
      return "text-rose-700 bg-rose-50 border-rose-200";
    case "today":
      return "text-amber-900 bg-amber-50 border-amber-300";
    case "soon":
      return "text-orange-800 bg-orange-50 border-orange-200";
    case "ok":
      return "text-slate-600 bg-slate-50 border-slate-200";
    default:
      return "text-slate-400";
  }
}
