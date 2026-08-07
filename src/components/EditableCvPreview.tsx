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

/**
 * A4 Visual Editor — prefer 1:1 rendering.
 * Column scrolls vertically so the full preview remains reachable.
 */
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
      const fitted = w >= A4_W_PX ? 1 : Math.max(0.88, w / A4_W_PX);
      setScale(Number.isFinite(fitted) ? fitted : 1);
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
    <div className="flex max-h-[calc(100vh-7.5rem)] flex-col rounded-2xl border border-slate-200/50 bg-slate-100/40 p-3 sm:p-4">
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-medium text-slate-500">
          A4 CV · 标准字号 · 可编辑
        </p>
        <div className="flex flex-wrap items-center gap-1.5">{toolbar}</div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `${CV_SHEET_CSS}\n${extraCss || ""}`,
        }}
      />
      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
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
              transform: scale === 1 ? undefined : `scale(${scale})`,
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
              className="h-full w-full outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500/20 [&_.cv-sheet]:h-full [&_.cv-sheet]:overflow-hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
