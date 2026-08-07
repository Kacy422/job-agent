"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { CV_SHEET_CSS } from "@/lib/cv-template";

interface Props {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  exportRef: RefObject<HTMLDivElement | null>;
  toolbar?: ReactNode;
}

/** A4 Visual Editor — contentEditable, print uses live DOM */
export function EditableCvPreview({
  initialHtml,
  onHtmlChange,
  exportRef,
  toolbar,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const seeded = useRef(false);

  function bindRef(node: HTMLDivElement | null) {
    hostRef.current = node;
    if (exportRef) {
      (exportRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    }
  }

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !initialHtml) return;
    if (!seeded.current) {
      el.innerHTML = initialHtml;
      seeded.current = true;
      onHtmlChange(el.innerHTML);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]);

  function flush() {
    const el = hostRef.current;
    if (!el) return;
    onHtmlChange(el.innerHTML);
  }

  return (
    <div className="glass-panel overflow-auto bg-slate-100/40 p-3 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-medium text-slate-600">
          A4 Visual Editor · 点击文字直接修改 · 拉满单页
        </p>
        <div className="flex flex-wrap items-center gap-1.5">{toolbar}</div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: CV_SHEET_CSS }} />
      <div className="cv-a4-frame overflow-hidden bg-white">
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
