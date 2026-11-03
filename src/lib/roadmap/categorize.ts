import type { CategorizedWaves, TrackerEpic } from "@/lib/roadmap/types";

/**
 * Split all waves across epics into strategic buckets.
 *
 * - agora:   wave.status ∈ { in_progress, partial }
 * - proximo: wave.status === not_started AND epic has ≥1 wave delivered|partial
 * - depois:  wave.status === not_started AND epic has 0 delivered|partial
 *
 * Excluded (none of the 3 buckets): delivered, parked, blocked, unknown.
 * These are shown in the technical view only.
 */
export function categorize(epics: TrackerEpic[]): CategorizedWaves {
  const agora: CategorizedWaves["agora"] = [];
  const proximo: CategorizedWaves["proximo"] = [];
  const depois: CategorizedWaves["depois"] = [];

  for (const epic of epics) {
    const epicHasDelivered = epic.waves.some(
      (w) => w.status === "delivered" || w.status === "partial",
    );
    for (const wave of epic.waves) {
      if (wave.status === "in_progress" || wave.status === "partial") {
        agora.push({ epic, wave });
      } else if (wave.status === "not_started") {
        (epicHasDelivered ? proximo : depois).push({ epic, wave });
      }
    }
  }
  return { agora, proximo, depois };
}
