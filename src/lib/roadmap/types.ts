/**
 * Shared types for the /roadmap page (E5 F1+F2).
 *
 * Mirrors the shape returned by /api/delivery/tracker (see
 * src/app/api/delivery/tracker/route.ts).
 * Extracted to a shared module so both /roadmap and /api/roadmap/deps
 * route can import without duplicating interfaces inline.
 */

export interface TrackerWave {
  id: string;
  status: "delivered" | "in_progress" | "not_started" | "parked" | "blocked" | "partial" | string;
  delivered_at?: string;
  features?: string[];
  spec?: string | null;
  reason?: string;
  blocker?: string;
}

export interface TrackerEpic {
  id: string;
  name: string;
  status: string;
  waves: TrackerWave[];
}

export interface TrackerBlocker {
  id: string;
  summary: string;
  since: string;
  blocks: string[];
  status: "active" | "resolved" | string;
  notes?: string;
  unblocks_when?: string;
}

export interface TrackerRisk {
  id: string;
  summary: string;
  since: string;
  severity: "low" | "medium" | "high" | string;
  status: "open" | "mitigated" | "materialized" | string;
  mitigation?: string;
  notes?: string;
}

export interface TrackerSummary {
  total_epics: number;
  epics_delivered: number;
  epics_partial: number;
  epics_not_started: number;
  total_waves: number;
  waves_delivered: number;
  waves_in_progress: number;
  waves_parked: number;
  waves_blocked: number;
  blockers_active: number;
  blockers_resolved: number;
  risks_open: number;
  risks_mitigated: number;
  risks_materialized: number;
}

export interface TrackerResponse {
  generated_at: string;
  source: string;
  epics: TrackerEpic[];
  blockers: TrackerBlocker[];
  risks: TrackerRisk[];
  summary: TrackerSummary;
}

export type DepsMap = Record<string, string[]>;

export interface DepsResponse {
  generated_at: string;
  source: string;
  deps: DepsMap;
}

export interface WaveWithEpic {
  epic: TrackerEpic;
  wave: TrackerWave;
}

export interface CategorizedWaves {
  agora: WaveWithEpic[];
  proximo: WaveWithEpic[];
  depois: WaveWithEpic[];
}
