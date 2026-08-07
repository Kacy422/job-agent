"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import { CV_SHEET_CSS } from "@/lib/cv-template";

/** CSS mm → px at 96dpi */
const A4_W_PX = (210 / 25.4) * 96;
const A4_H_PX = (297 / 25.4) * 96;

interface Props {
  initialHtml: string;
  /** Bump to force re-seed of editor content (e.g. after AI rewrite) */
  contentKey?: string | number;
  onHtmlChange: (html: string) => void;
  exportRef: RefObject<HTMLDivElement | null>;
  toolbar?: ReactNode;
  extraCss?: string;
}

/** A4 Visual Editor — scaled to fit column width so full page is visible */
export function EditableCvPreview({
  initialHtml,
  contentKey = 0,
  onHtmlChange,
  exportRef,
  toolbar,
  extraCss,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastKey = useRef<string | number | null>(null);
  const [scale, setScale] = useState(1);

  function bindRef(node: HTMLDivElement | null) {
    hostRef.current = node;
    if (exportRef) {
      (exportRef as MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !initialHtml) return;
    if (lastKey.current === contentKey && el.innerHTML) return;
    lastKey.current = contentKey;
    el.innerHTML = initialHtml;
    onHtmlChange(el.innerHTML);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, initialHtml]);

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const update = () => {
      const w = vp.clientWidth;
      if (w <= 0) return;
      // Fit full A4 into column width (and soft-cap by viewport height)
      const maxH = Math.max(320, window.innerHeight * 0.78);
      const next = Math.min(w / A4_W_PX, maxH / A4_H_PX, 1);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(vp);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  function flush() {
    const el = hostRef.current;
    if (!el) return;
    onHtmlChange(el.innerHTML);
  }

  return (
    <div className="rounded-2xl border border-slate-200/50 bg-slate-100/40 p-2.5 sm:p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-medium text-slate-500">
          A4 CV · 整页预览 · 可编辑
        </p>
        <div className="flex flex-wrap items-center gap-1.5">{toolbar}</div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `${CV_SHEET_CSS}\n${extraCss || ""}`,
        }}
      />
      <div ref={viewportRef} className="relative w-full overflow-hidden">
        <div
          className="relative mx-auto"
          style={{
            width: A4_W_PX * scale,
            height: A4_H_PX * scale,
          }}
        >
          <div
            className="cv-a4-frame absolute left-0 top-0 origin-top-left bg-white shadow-sm"
            style={{
              width: A4_W_PX,
              height: A4_H_PX,
              transform: `scale(${scale})`,
            }}
          >
            <div
              ref={bindRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="A4 CV editor"
              spellCheck
              onInput={flush}
              onBlur={flush}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
                flush();
              }}
              className="h-full w-full outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500/20 [&_.cv-sheet]:h-full [&_.cv-sheet]:max-h-full [&_.cv-sheet]:overflow-hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
