/**
 * ModuleStream — shared page wrapper for every Mission Control module.
 *
 * Per spec §4.3: all module pages (Knowledge, Approvals, Health, Cost,
 * Activity) follow the same "vertical stream with collapsible sections"
 * pattern. This component is the outer container: a max-width column with
 * a page heading and the module body underneath.
 *
 * Deliberately minimal:
 *   - no sidebar, no tabs, no breadcrumbs, no toolbars
 *   - no data fetching of any kind
 *   - children are expected to be one or more `ModuleSection` components,
 *     but any React node works
 *
 * This is a server component — no client-only state — so the inner
 * `ModuleSection` components hydrate independently.
 */

import type { ReactNode } from "react";

export interface ModuleStreamProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ModuleStream({ title, subtitle, children }: ModuleStreamProps) {
  return (
    <div
      data-mc-module-stream
      style={{
        maxWidth: "960px",
        marginInline: "auto",
      }}
    >
      <header style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              marginTop: "4px",
              marginBottom: 0,
              fontSize: "13px",
              color: "var(--text-muted)",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
