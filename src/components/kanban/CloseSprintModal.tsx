"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/lib/kanban/stateReader";

export type CarryAction = "move_current" | "move_next" | "archive";
export interface CarryoverEntry {
  task_id: string;
  action: CarryAction;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pending: Task[];
  onConfirm: (carryover: CarryoverEntry[]) => Promise<void> | void;
}

const LABEL: Record<CarryAction, string> = {
  move_current: "move → novo current",
  move_next: "move → novo next",
  archive: "archive",
};

export function CloseSprintModal({
  open,
  onClose,
  pending,
  onConfirm,
}: Props) {
  const [decisions, setDecisions] = useState<Record<string, CarryAction>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDecisions({});
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const allDecided = pending.every((t) => decisions[t.id] !== undefined);
  const canConfirm = allDecided && !busy;

  async function submit() {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm(
        pending.map((t) => ({ task_id: t.id, action: decisions[t.id] })),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      style={{ zIndex: 200 }}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-[720px] max-w-[95vw] overflow-y-auto rounded border border-[var(--border)] bg-[var(--card)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Fechar sprint atual</h2>
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          {pending.length} task(s) pendente(s). Decida individualmente pra cada uma:
        </p>

        {pending.length === 0 && (
          <p className="text-sm italic text-[var(--text-muted)]">
            Nada pendente — sprint atual pode fechar sem carry-over.
          </p>
        )}

        {pending.map((t) => (
          <div key={t.id} className="border-b border-[var(--border)] py-2">
            <div className="text-xs font-mono text-[var(--text-muted)]">
              {t.id} [{t.status}]
              {t.project && <span className="ml-2">project: {t.project}</span>}
            </div>
            <div className="text-sm text-[var(--text-primary)]">{t.title}</div>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              {(["move_current", "move_next", "archive"] as CarryAction[]).map(
                (a) => (
                  <label key={a} className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <input
                      type="radio"
                      name={`d-${t.id}`}
                      checked={decisions[t.id] === a}
                      onChange={() =>
                        setDecisions((d) => ({ ...d, [t.id]: a }))
                      }
                    />
                    {LABEL[a]}
                  </label>
                ),
              )}
            </div>
          </div>
        ))}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
            Abortar
          </button>
          <button
            onClick={submit}
            disabled={!canConfirm}
            className="rounded border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-1 text-sm text-[var(--warning)] disabled:opacity-50"
          >
            {busy ? "Fechando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
