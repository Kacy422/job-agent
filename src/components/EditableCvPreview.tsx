"use client";

import {
  useEffect,
  useRef,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import { CV_SHEET_CSS } from "@/lib/cv-template";

interface Props {
  initialHtml: string;
  /** Bump to force re-seed of editor content (e.g. after AI rewrite) */
  contentKey?: string | number;
  onHtmlChange: (html: string) => void;
  exportRef: RefObject<HTMLDivElement | null>;
  toolbar?: ReactNode;
  extraCss?: string;
}

/** A4 Visual Editor — contentEditable; resets when contentKey changes */
export function EditableCvPreview({
  initialHtml,
  contentKey = 0,
  onHtmlChange,
  exportRef,
  toolbar,
  extraCss,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lastKey = useRef<string | number | null>(null);

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

  function flush() {
    const el = hostRef.current;
    if (!el) return;
    onHtmlChange(el.innerHTML);
  }

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200/50 bg-slate-100/40 p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-medium text-slate-500">
          A4 CV · 可直接编辑
        </p>
        <div className="flex flex-wrap items-center gap-1.5">{toolbar}</div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `${CV_SHEET_CSS}\n${extraCss || ""}`,
        }}
      />
      <div className="cv-a4-frame overflow-hidden bg-white shadow-sm">
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
          className="outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500/20 [&_.cv-sheet]:min-h-[297mm]"
        />
      </div>
    </div>
  );
}
