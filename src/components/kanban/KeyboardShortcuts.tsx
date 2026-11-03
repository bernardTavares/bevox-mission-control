"use client";

import { useEffect } from "react";

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

interface Options {
  disabled?: boolean;
  /** If true, shortcuts fire even when focus is in an input/textarea/select. */
  allowInEditable?: boolean;
}

/**
 * Global keyboard shortcuts hook. Skips when focus is in editable
 * (input/textarea/select/contentEditable) unless `allowInEditable` is on.
 * `Escape` always fires.
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  opts: Options = {},
) {
  useEffect(() => {
    if (opts.disabled) return;
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(target?.isContentEditable);
      if (inEditable && !opts.allowInEditable && e.key !== "Escape") return;
      const fn = shortcuts[e.key];
      if (fn) {
        e.preventDefault();
        fn(e);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts, opts.disabled, opts.allowInEditable]);
}
