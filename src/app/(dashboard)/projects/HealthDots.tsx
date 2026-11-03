"use client";

import type { Dot, ProjectHealth } from "@/lib/projects/types";

interface Props {
  health: ProjectHealth;
  compact?: boolean;
}

const DOT_COLOR: Record<Dot, string> = {
  ok: "bg-green-500",
  partial: "bg-yellow-500",
  missing: "bg-red-400",
};

const LABELS = {
  bot: "Bot",
  workspace: "Workspace",
  kanban: "Kanban",
  knowledge: "Docs",
} as const;

export default function HealthDots({ health, compact = false }: Props) {
  const entries: Array<[keyof ProjectHealth, Dot]> = [
    ["bot", health.bot],
    ["workspace", health.workspace],
    ["kanban", health.kanban],
    ["knowledge", health.knowledge],
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {entries.map(([key, dot]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 text-[11px] text-gray-600"
          title={`${LABELS[key]}: ${dot}`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${DOT_COLOR[dot]}`} />
          {!compact && <span>{LABELS[key]}</span>}
        </span>
      ))}
    </div>
  );
}
