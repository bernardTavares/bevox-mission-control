"use client";

import { useEffect, useState } from "react";

interface Props {
  taskId: string;
  taskTitle: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function BlockModal({ taskId, taskTitle, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 max-w-full rounded border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          Block {taskId}:{" "}
          <span className="font-normal text-[var(--text-muted)]">
            {taskTitle}
          </span>
        </h2>
        <label className="mb-1 block text-xs text-[var(--text-secondary)]">
          Reason (required):
        </label>
        <input
          autoFocus
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && reason.trim()) onConfirm(reason.trim());
          }}
          className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--text-primary)]"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="rounded bg-amber-700 px-3 py-1 text-sm text-amber-50 disabled:opacity-50"
          >
            Block
          </button>
        </div>
      </div>
    </div>
  );
}
