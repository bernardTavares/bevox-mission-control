"use client";

import Link from "next/link";
import { Plus, XCircle, Archive, History } from "lucide-react";

interface Props {
  projects: string[];
  projectFilter: string | null;
  onChangeProjectFilter: (p: string | null) => void;
  search: string;
  onChangeSearch: (s: string) => void;
  showArchived: boolean;
  onToggleArchived: (v: boolean) => void;
  blockedOnly: boolean;
  onToggleBlockedOnly: (v: boolean) => void;
  blockedCount: number;
  onNewTask: () => void;
  onCloseSprint?: () => void;
  filtersDirty?: boolean;
  onResetFilters?: () => void;
}

/**
 * Filters + action buttons. Current/next toggle foi movido pro
 * SprintSwitcher (componente sticky acima da board). Esta barra mantém
 * apenas filtros e ações.
 */
export function TopBar({
  projects,
  projectFilter,
  onChangeProjectFilter,
  search,
  onChangeSearch,
  showArchived,
  onToggleArchived,
  blockedOnly,
  onToggleBlockedOnly,
  blockedCount,
  onNewTask,
  onCloseSprint,
  filtersDirty,
  onResetFilters,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
      <select
        value={projectFilter ?? ""}
        onChange={(e) => onChangeProjectFilter(e.target.value || null)}
        className="rounded border border-[var(--border)] bg-[var(--card)] p-1 text-sm text-[var(--text-primary)]"
      >
        <option value="">all projects</option>
        {projects.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input
        value={search}
        onChange={(e) => onChangeSearch(e.target.value)}
        placeholder="search…"
        className="rounded border border-[var(--border)] bg-[var(--card)] p-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
      />
      <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => onToggleArchived(e.target.checked)}
        />
        Mostrar archived
      </label>
      <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={blockedOnly}
          onChange={(e) => onToggleBlockedOnly(e.target.checked)}
        />
        Show blocked only
      </label>
      <span className="text-xs text-[var(--text-muted)]">
        Blocked: {blockedCount}
      </span>
      <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={blockedOnly}
          onChange={(e) => onToggleBlockedOnly(e.target.checked)}
        />
        Show blocked only
      </label>
      <span className="text-xs text-[var(--text-muted)]">
        Blocked: {blockedCount}
      </span>
      {filtersDirty && onResetFilters && (
        <button
          onClick={onResetFilters}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          Limpar filtros
        </button>
      )}
      <div className="flex-1" />
      <button
        onClick={onNewTask}
        className="flex items-center gap-1 rounded border border-[var(--success)] bg-[var(--success-bg)] px-3 py-1 text-sm text-[var(--success)] hover:opacity-90"
      >
        <Plus size={14} /> Nova task
      </button>
      {onCloseSprint && (
        <button
          onClick={onCloseSprint}
          className="flex items-center gap-1 rounded border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-1 text-sm text-[var(--warning)] hover:opacity-90"
        >
          <XCircle size={14} /> Fechar sprint
        </button>
      )}
      <Link
        href="/kanban/archived"
        className="flex items-center gap-1 rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      >
        <Archive size={14} /> Archived
      </Link>
      <Link
        href="/kanban/history"
        className="flex items-center gap-1 rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      >
        <History size={14} /> History
      </Link>
    </div>
  );
}
