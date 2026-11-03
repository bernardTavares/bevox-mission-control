"use client";

import type {
  CapabilityCell as CapabilityCellType,
  CapabilityState,
} from "@/lib/projects/doctor-types";

interface Props {
  capability: string;
  cell: CapabilityCellType | undefined;
}

/**
 * Visual style per spec §UX:
 *   ✅ provisioned (green)
 *   ⚠ partial (yellow)
 *   ❌ absent (gray)
 *   🚨 drifted (red)
 *   ⏸ skipped (light gray)
 *
 * If cell.drift === true the rendered state is forced to "drifted" even
 * if detected/declared individually report a non-drift state — matches
 * the doctor contract where `drift` is the authoritative summary flag.
 */
function effectiveState(cell: CapabilityCellType): CapabilityState {
  if (cell.drift) return "drifted";
  // Prefer detected; fall back to declared if detected was skipped.
  if (cell.detected === "skipped") return cell.declared;
  return cell.detected;
}

const STATE_STYLE: Record<
  CapabilityState,
  { bg: string; icon: string; label: string }
> = {
  provisioned: { bg: "bg-green-500", icon: "✓", label: "provisioned" },
  partial: { bg: "bg-yellow-500", icon: "~", label: "partial" },
  absent: { bg: "bg-gray-300", icon: "·", label: "absent" },
  drifted: { bg: "bg-red-500", icon: "!", label: "drifted" },
  skipped: { bg: "bg-gray-200", icon: "—", label: "skipped" },
};

export default function CapabilityCell({ capability, cell }: Props) {
  if (!cell) {
    return (
      <td className="p-1 text-center align-middle">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs text-gray-400"
          title={`${capability}: no data`}
          aria-label={`${capability}: no data`}
        >
          ?
        </span>
      </td>
    );
  }

  const state = effectiveState(cell);
  const style = STATE_STYLE[state];

  const tooltipParts = [
    `${capability}: ${style.label}`,
    `declared=${cell.declared}`,
    `detected=${cell.detected}`,
  ];
  if (cell.drift_reason) tooltipParts.push(cell.drift_reason);
  const tooltip = tooltipParts.join("\n");

  return (
    <td className="p-1 text-center align-middle">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded ${style.bg} text-xs font-bold text-white`}
        title={tooltip}
        aria-label={tooltip}
        role="img"
      >
        {style.icon}
      </span>
    </td>
  );
}
