"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CvRationale } from "@/types";

export type CvHighlight = {
  id: string;
  kind: "added" | "removed" | "changed";
  phrase: string;
  reason: string;
  /** Sidebar label (Chinese summary) */
  label: string;
};

export const CV_REVIEW_CSS = `
mark.cv-hl {
  border-radius: 2px;
  padding: 0 1px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
mark.cv-hl-added {
  background-color: rgba(52, 211, 153, 0.35);
  text-decoration: underline;
  text-decoration-color: rgba(5, 150, 105, 0.55);
  text-underline-offset: 2px;
}
mark.cv-hl-changed {
  background-color: rgba(250, 204, 21, 0.4);
  text-decoration: underline;
  text-decoration-color: rgba(202, 138, 4, 0.55);
  text-underline-offset: 2px;
}
mark.cv-hl-removed {
  background-color: rgba(251, 113, 133, 0.28);
  text-decoration: line-through;
  text-decoration-color: rgba(225, 29, 72, 0.7);
}
`;

export function stripReviewMarks(html: string) {
  return html
    .replace(/<\/?mark\b[^>]*>/gi, "")
    .replace(/\sdata-comment-id="[^"]*"/gi, "")
    .replace(/\sdata-hl-kind="[^"]*"/gi, "");
}

/** Snap phrase casing to the exact substring present in HTML text */
export function snapPhraseToHtml(html: string, phrase: string): string | null {
  const plain = stripReviewMarks(html).replace(/<[^>]+>/g, " ");
  const needle = phrase.trim();
  if (needle.length < 2) return null;
  const idx = plain.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return null;
  return plain.slice(idx, idx + needle.length);
}

/** Build highlights from rationale + optional API highlights — phrases MUST exist in HTML */
export function buildHighlights(
  html: string,
  rationale: CvRationale,
  apiHighlights?: Partial<CvHighlight>[]
): CvHighlight[] {
  const plain = stripReviewMarks(html);
  const out: CvHighlight[] = [];
  const seen = new Set<string>();

  const push = (h: CvHighlight) => {
    if (h.kind === "removed") {
      out.push(h);
      return;
    }
    const snapped = snapPhraseToHtml(plain, h.phrase);
    if (!snapped) return;
    const key = snapped.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...h, phrase: snapped });
  };

  if (Array.isArray(apiHighlights) && apiHighlights.length) {
    apiHighlights.forEach((h, i) => {
      const phrase = String(h.phrase || "").trim();
      if (phrase.length < 2) return;
      push({
        id: String(h.id || `h${i}`),
        kind: (h.kind as CvHighlight["kind"]) || "added",
        phrase,
        reason: String(h.reason || "").trim(),
        label: String(h.label || h.phrase || "").trim() || phrase.slice(0, 40),
      });
    });
  }

  if (out.filter((h) => h.kind !== "removed").length === 0) {
    rationale.added.forEach((item, i) => {
      const phrase = findBestPhrase(plain, item.text);
      if (!phrase) return;
      push({
        id: `add-${i}`,
        kind: "added",
        phrase,
        reason: item.reason || "",
        label: item.text,
      });
    });
  }

  rationale.removed.forEach((item, i) => {
    out.push({
      id: `rm-${i}`,
      kind: "removed",
      phrase: "",
      reason: item.reason || "",
      label: item.text,
    });
  });

  return out;
}

function findBestPhrase(html: string, hint: string): string | null {
  const clean = hint.trim();
  if (clean.length < 2) return null;
  const eng = clean.match(/[A-Za-z][A-Za-z0-9+./%&\-\s]{2,}/g);
  if (eng) {
    for (const cand of eng.sort((a, b) => b.length - a.length)) {
      const t = cand.trim();
      const snapped = snapPhraseToHtml(html, t);
      if (t.length >= 3 && snapped) return snapped;
    }
  }
  const direct = snapPhraseToHtml(html, clean);
  if (direct) return direct;
  const words = clean.split(/[\s,，、/|]+/).filter((w) => w.length >= 4);
  for (const w of words) {
    const snapped = snapPhraseToHtml(html, w);
    if (snapped) return snapped;
  }
  return null;
}

/**
 * Apply marks only for phrases that exist in the CV body.
 * Returns highlighted HTML + the subset of highlights that were actually marked
 * (plus removed-only comments).
 */
export function applyHighlightsToHtml(
  html: string,
  highlights: CvHighlight[]
): { html: string; applied: CvHighlight[] } {
  let out = stripReviewMarks(html);
  const applied: CvHighlight[] = [];

  for (const h of highlights) {
    if (h.kind === "removed") {
      applied.push(h);
      continue;
    }
    if (!h.phrase) continue;
    const snapped = snapPhraseToHtml(out, h.phrase);
    if (!snapped) continue;
    const escaped = snapped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      const re = new RegExp(`(${escaped})`, "i");
      if (!re.test(out)) continue;
      const kindClass =
        h.kind === "changed" ? "cv-hl-changed" : "cv-hl-added";
      out = out.replace(
        re,
        `<mark class="cv-hl ${kindClass}" data-comment-id="${h.id}">$1</mark>`
      );
      if (out.includes(`data-comment-id="${h.id}"`)) {
        applied.push({ ...h, phrase: snapped });
      }
    } catch {
      /* ignore */
    }
  }
  return { html: out, applied };
}

type Line = { x1: number; y1: number; x2: number; y2: number; kind: string };

export function CvReviewLayout({
  cv,
  comments,
  highlights,
}: {
  cv: ReactNode;
  comments: ReactNode;
  highlights: CvHighlight[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const redraw = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootBox = root.getBoundingClientRect();
    const next: Line[] = [];

    for (const h of highlights) {
      if (!h.phrase || h.kind === "removed") continue;
      const mark = root.querySelector(
        `mark[data-comment-id="${CSS.escape(h.id)}"]`
      ) as HTMLElement | null;
      const card = root.querySelector(
        `[data-comment-card="${CSS.escape(h.id)}"]`
      ) as HTMLElement | null;
      if (!mark || !card) continue;
      const m = mark.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      next.push({
        x1: m.right - rootBox.left,
        y1: m.top + m.height / 2 - rootBox.top,
        x2: c.left - rootBox.left,
        y2: c.top + Math.min(18, c.height / 2) - rootBox.top,
        kind: h.kind,
      });
    }
    setLines(next);
  }, [highlights]);

  useLayoutEffect(() => {
    redraw();
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(root);
    window.addEventListener("scroll", redraw, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", redraw, true);
    };
  }, [redraw, highlights]);

  return (
    <div ref={rootRef} className="relative">
      <div className="grid max-h-[calc(100vh-7.5rem)] gap-3 xl:grid-cols-[3fr_1fr]">
        <div className="min-h-0 min-w-0 overflow-y-auto">{cv}</div>
        <aside className="min-h-0 min-w-0 overflow-y-auto">{comments}</aside>
      </div>
      <svg
        className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
        aria-hidden
      >
        {lines.map((ln, i) => (
          <path
            key={i}
            d={`M ${ln.x1} ${ln.y1} C ${ln.x1 + 40} ${ln.y1}, ${ln.x2 - 40} ${ln.y2}, ${ln.x2} ${ln.y2}`}
            fill="none"
            stroke={
              ln.kind === "changed"
                ? "rgba(202, 138, 4, 0.55)"
                : "rgba(5, 150, 105, 0.5)"
            }
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        ))}
      </svg>
    </div>
  );
}

export function WordCommentCard({
  highlight,
}: {
  highlight: CvHighlight;
}) {
  const tone =
    highlight.kind === "removed"
      ? {
          bar: "border-l-rose-300",
          tag: "text-rose-600",
          tagText: "删减",
        }
      : highlight.kind === "changed"
        ? {
            bar: "border-l-amber-300",
            tag: "text-amber-700",
            tagText: "改写",
          }
        : {
            bar: "border-l-emerald-300",
            tag: "text-emerald-700",
            tagText: "增加",
          };

  return (
    <article
      data-comment-card={highlight.id}
      className={`border-l-2 ${tone.bar} bg-white/90 px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.06)]`}
    >
      <p className={`mb-0.5 text-[10px] font-medium ${tone.tag}`}>
        {tone.tagText}
      </p>
      <p className="text-[11px] font-medium leading-snug text-slate-800">
        {highlight.label}
      </p>
      {highlight.reason ? (
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
          {highlight.reason}
        </p>
      ) : null}
    </article>
  );
}
