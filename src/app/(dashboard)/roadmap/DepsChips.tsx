"use client";

import type { TrackerBlocker } from "@/lib/roadmap/types";

interface Props {
  /** Epic id (e.g. "E3") for filtering blockers that reference this epic/wave. */
  epicId?: string;
  /** Wave id for filtering blockers that reference this wave. */
  waveId?: string;
  /** List of epic deps (from parseDeps). Used for epic-level header chips. */
  epicDeps?: string[];
  /** All blockers from tracker (filter will happen here). */
  allBlockers: TrackerBlocker[];
  /** Compact mode for wave cards (smaller chips, no epic deps). */
  compact?: boolean;
}

/**
 * Renders dep chips for an epic or wave.
 *
 * - At epic-header level: chips for each epic dep (e.g. "deps: E1, E2").
 * - At wave-level: chips for each active blocker whose `blocks` includes
 *   `"<epicId>/<waveId>"` or the sentinel `"global"`.
 */
export default function DepsChips({
  epicId,
  waveId,
  epicDeps,
  allBlockers,
  compact = false,
}: Props) {
  const ref = epicId && waveId ? `${epicId}/${waveId}` : null;

  const relevantBlockers = allBlockers.filter((b) => {
    if (b.status !== "active") return false;
    if (!ref) return false;
    return b.blocks.includes(ref) || b.blocks.includes("global");
  });

  const showEpicDeps = !compact && epicDeps && epicDeps.length > 0;
  if (!showEpicDeps && relevantBlockers.length === 0) return null;

  const chipClass = compact
    ? "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
    : "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs";

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "" : "mt-1"}`}>
      {showEpicDeps &&
        epicDeps!.map((dep) => (
          <span
            key={`dep-${dep}`}
            className={`${chipClass} bg-blue-100 text-blue-800`}
            title={`depends on ${dep}`}
          >
            deps: {dep}
          </span>
        ))}
      {relevantBlockers.map((b) => (
        <span
          key={`blk-${b.id}`}
          className={`${chipClass} bg-red-100 text-red-800`}
          title={b.summary}
        >
          🚫 {b.id}
        </span>
      ))}
    </div>
  );
}
