"use client";

interface Props {
  open: boolean;
  onClose: () => void;
}

const GROUPS: Array<{
  title: string;
  items: Array<[string, string]>;
}> = [
  {
    title: "Navegação",
    items: [
      ["j / k", "próximo / anterior card"],
      ["Esc", "fechar modal ou drawer"],
    ],
  },
  {
    title: "Mutação",
    items: [
      ["n", "nova task"],
      ["→ / ←", "mover card focado entre colunas"],
      ["m", "mover card focado pra outro sprint"],
      ["a", "arquivar card focado"],
      ["b", "block / unblock card focado (modal pede reason)"],
      ["e", "abrir detail drawer"],
      ["c", "fechar sprint atual"],
    ],
  },
  {
    title: "Busca & ajuda",
    items: [
      ["/", "focar input de busca"],
      ["?", "mostrar atalhos"],
    ],
  },
];

export function ShortcutsCheatsheet({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-w-[95vw] rounded border border-[var(--border)] bg-[var(--card)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Atalhos de teclado</h2>
        <div className="space-y-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="mb-1 text-xs font-semibold uppercase text-[var(--text-muted)]">
                {g.title}
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {g.items.map(([key, desc]) => (
                    <tr key={key}>
                      <td className="w-32 pr-3 font-mono text-[var(--text-secondary)]">
                        {key}
                      </td>
                      <td className="text-[var(--text-secondary)]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
