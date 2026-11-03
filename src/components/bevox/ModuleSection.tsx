"use client";

/**
 * ModuleSection — single collapsible section inside a ModuleStream.
 *
 * Per spec §4.3: every module page is a stack of collapsible sections,
 * expanded by default, with a [-]/[+] toggle on the header. The caller
 * supplies the section title, an optional count, and the section body.
 *
 * Purely structural:
 *   - no data fetching
 *   - no special keyboard handling beyond the native <button> semantics
 *     (Enter / Space toggle is free from the browser)
 *   - no animation — instant collapse, matching the spec's "shell util
 *     antes de bonito" principle
 *
 * Client component because the toggle state lives in `useState`.
 */

import { useState, type ReactNode } from "react";

export interface ModuleSectionProps {
  title: string;
  /** Optional item count shown next to the title, e.g. "DRAFTS · 2". */
  count?: number;
  /** Defaults to true — sections start expanded. */
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ModuleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: ModuleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      data-mc-module-section
      data-open={open ? "true" : "false"}
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        backgroundColor: "var(--surface)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "10px 14px",
          backgroundColor: "transparent",
          border: "none",
          color: "var(--text-primary)",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--font-heading)",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "12px",
              color: "var(--text-muted)",
              width: "14px",
              display: "inline-block",
            }}
          >
            [{open ? "−" : "+"}]
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
            }}
          >
            {title}
          </span>
          {typeof count === "number" ? (
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: 400,
              }}
            >
              · {count}
            </span>
          ) : null}
        </span>
      </button>
      {open ? (
        <div
          style={{
            padding: "4px 14px 14px 14px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
