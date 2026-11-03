/**
 * Navigation config for the Bevox Mission Control top nav.
 *
 * v1 ships 6 items split into two groups:
 *   - nucleo: Home, Knowledge, Approvals  (core operational surface)
 *   - suporte: Health, Cost, Activity     (observability complements)
 *
 * The groups render as `Home · Knowledge · Approvals ‖ Health · Cost · Activity`
 * with nucleo visually weighted heavier than suporte.
 *
 * Discovery deltas applied:
 *   - Cost route is `/costs` (plural) — upstream already has `(dashboard)/costs`.
 *   - Activity route is `/activity` — upstream already has `(dashboard)/activity`,
 *     which will be replaced by our events.jsonl-backed version in Task 15b.
 *     Until then, clicking the link renders the upstream activity page (a
 *     functional fallback, not a broken link).
 *
 * Scope note: Activity is STILL a stretch goal per the spec §2.2 reduction
 * rule. Its entry stays in the nav because the visual shell is shaped around
 * 6 items; the stretch decision is about the page content, not the nav slot.
 * If the stretch is cut, we can remove this one line with zero rework.
 */

export interface NavItem {
  label: string;
  href: string;
  group: 'nucleo' | 'suporte';
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', group: 'nucleo' },
  { label: 'Knowledge', href: '/knowledge', group: 'nucleo' },
  { label: 'Approvals', href: '/approvals', group: 'nucleo' },
  { label: 'Health', href: '/health', group: 'suporte' },
  { label: 'Cost', href: '/costs', group: 'suporte' },
  { label: 'Activity', href: '/activity', group: 'suporte' },
];
