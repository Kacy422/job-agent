"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import {
  coverLetterEditorHtmlToText,
  coverLetterTextToEditorHtml,
} from "@/lib/cover-letter";

type Props = {
  value: string;
  onChange: (text: string) => void;
  /** Bump after AI regenerate so editor reseeds */
  contentKey?: string | number;
  disabled?: boolean;
  className?: string;
};

/**
 * Online Cover Letter editor — contentEditable paragraphs synced to plain-text state.
 */
export function EditableCoverLetter({
  value,
  onChange,
  contentKey = 0,
  disabled = false,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastKey = useRef<string | number | null>(null);
  const skipNextInput = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastKey.current === contentKey && el.innerHTML) return;
    lastKey.current = contentKey;
    skipNextInput.current = true;
    el.innerHTML = coverLetterTextToEditorHtml(value);
  }, [contentKey, value]);

  function flush() {
    const el = ref.current;
    if (!el || disabled) return;
    onChange(coverLetterEditorHtmlToText(el.innerHTML));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      // Let browser insert <p> / <div>; flush after
      requestAnimationFrame(flush);
    }
  }

  return (
    <div
      ref={ref}
      contentEditable={!disabled}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline
      aria-label="Cover Letter editor"
      spellCheck
      onInput={() => {
        if (skipNextInput.current) {
          skipNextInput.current = false;
          return;
        }
        flush();
      }}
      onBlur={flush}
      onKeyDown={onKeyDown}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
        flush();
      }}
      className={`min-h-[200px] max-h-[420px] overflow-y-auto rounded-xl border border-slate-200/70 bg-white/90 px-3.5 py-3 text-xs leading-relaxed text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/25 [&_p]:mb-3 [&_p]:last:mb-0 ${
        disabled ? "opacity-60" : ""
      } ${className}`}
    />
  );
}
