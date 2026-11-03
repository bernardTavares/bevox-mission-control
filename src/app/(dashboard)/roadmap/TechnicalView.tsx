"use client";

import { useState } from "react";
import type { DepsMap, TrackerBlocker, TrackerEpic } from "@/lib/roadmap/types";
import WaveCard from "./WaveCard";
import DepsChips from "./DepsChips";

interface Props {
  epics: TrackerEpic[];
  deps: DepsMap;
  allBlockers: TrackerBlocker[];
}

type StatusFilter = "all" | "delivered" | "partial" | "in_progress" | "not_started" | "parked" | "blocked";

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "delivered", label: "Delivered" },
  { key: "partial", label: "Partial" },
  { key: "in_progress", label: "In progress" },
  { key: "not_started", label: "Not started" },
  { key: "parked", label: "Parked" },
  { key: "blocked", label: "Blocked" },
];

export default function TechnicalView({ epics, deps, allBlockers }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<StatusFilter>("all");

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const isVisible = (status: string) =>
    filter === "all" || status === filter;

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-2 py-1 rounded ${
              filter === f.key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {epics.map((epic) => {
          const visibleWaves = epic.waves.filter((w) => isVisible(w.status));
          if (visibleWaves.length === 0 && filter !== "all") return null;
          const isExpanded = expanded[epic.id] ?? false;
          const epicDeps = deps[epic.id] ?? [];
          return (
            <div key={epic.id} className="border border-gray-200 rounded-md">
              <button
                onClick={() => toggle(epic.id)}
                className="w-full text-left p-2 hover:bg-gray-50 flex items-center gap-2 flex-wrap"
              >
                <span className="text-xs font-mono text-gray-500">{epic.id}</span>
                <span className="text-sm font-medium text-gray-900 flex-1">{epic.name}</span>
                <span className="text-[10px] rounded px-1.5 py-0.5 bg-gray-100 text-gray-700">
                  {epic.status}
                </span>
                <span className="text-[11px] text-gray-400">
                  {visibleWaves.length}/{epic.waves.length} waves
                </span>
                <span className="text-xs text-gray-500">{isExpanded ? "▾" : "▸"}</span>
              </button>
              {epicDeps.length > 0 && (
                <div className="px-2 pb-1">
                  <DepsChips
                    epicDeps={epicDeps}
                    allBlockers={allBlockers}
                  />
                </div>
              )}
              {isExpanded && (
                <div className="border-t border-gray-200 p-2 flex flex-col gap-2 bg-gray-50">
                  {visibleWaves.map((wave) => (
                    <WaveCard
                      key={wave.id}
                      epic={epic}
                      wave={wave}
                      allBlockers={allBlockers}
                      variant="technical"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
