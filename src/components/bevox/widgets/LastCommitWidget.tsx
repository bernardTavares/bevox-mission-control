"use client";

/**
 * Home widget — Last commit of bevox-knowledge (right column, compact).
 * Reads /api/bevox/git-last-commit (Task 9).
 */

import { useEffect, useState } from "react";
import { WidgetCard } from "./WidgetCard";
import type { GitCommitInfo } from "@/lib/bevox/git-ops";

interface Response {
  commit: GitCommitInfo;
  branch: string;
}

function humanAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function LastCommitWidget() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bevox/git-last-commit")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Response) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <WidgetCard title="Last commit">
        <div style={{ color: "var(--error)", fontSize: "12px" }}>
          error: {error}
        </div>
      </WidgetCard>
    );
  }
  if (!data?.commit) {
    return (
      <WidgetCard title="Last commit">
        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>…</div>
      </WidgetCard>
    );
  }

  const c = data.commit;
  return (
    <WidgetCard title="Last commit">
      <div
        style={{
          fontFamily: "var(--font-jetbrains)",
          fontSize: "11px",
          color: "var(--accent)",
          fontWeight: 600,
        }}
      >
        {c.short_sha}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginTop: "2px",
        }}
        title={c.subject}
      >
        {c.subject}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          marginTop: "4px",
        }}
      >
        {c.author} · {humanAge(c.age_seconds)} ago · {data.branch}
      </div>
    </WidgetCard>
  );
}
