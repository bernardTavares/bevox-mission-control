"use client";

import { useState } from "react";

export type FoldersTree = Record<string, { count: number; files: string[] }>;

export interface DocTreeProps {
  tree: FoldersTree;
  projectId: string;
  selected: string | null;
  onSelectFile: (relativePath: string) => void;
}

const FOLDER_ORDER = [
  "10_prd",
  "20_architecture",
  "30_adr",
  "35_specs",
  "40_roadmap",
  "50_releases",
  "60_customer-feedback",
  "70_metrics",
] as const;

/**
 * File tree colapsavel pros 8 folders canonicos. Folders com count > 0
 * iniciam expandidos; com count 0 mostram badge cinza nao-clicavel.
 */
export function DocTree({ tree, projectId, selected, onSelectFile }: DocTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const f of FOLDER_ORDER) {
      init[f] = (tree[f]?.count ?? 0) > 0;
    }
    return init;
  });

  return (
    <div style={{ fontFamily: "monospace", fontSize: "0.7rem", lineHeight: 1.7, color: "#e0e0e0" }}>
      {FOLDER_ORDER.map((folder) => {
        const data = tree[folder] ?? { count: 0, files: [] };
        const isOpen = expanded[folder];
        const empty = data.count === 0;
        return (
          <div key={folder}>
            <button
              type="button"
              onClick={() => !empty && setExpanded((prev) => ({ ...prev, [folder]: !prev[folder] }))}
              disabled={empty}
              style={{
                background: "transparent",
                border: "none",
                color: empty ? "#444" : "#888",
                cursor: empty ? "default" : "pointer",
                padding: 0,
                fontSize: "0.7rem",
                fontFamily: "monospace",
              }}
            >
              {empty ? "·" : isOpen ? "▼" : "▶"} {folder}{" "}
              <span style={{ color: "#666", fontSize: "0.6rem" }}>({data.count})</span>
            </button>
            {isOpen && data.files.length > 0 && (
              <div style={{ paddingLeft: "1rem" }}>
                {data.files.map((name) => {
                  const relPath = `${folder}/${projectId}/${name}`;
                  const active = selected === relPath;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onSelectFile(relPath)}
                      style={{
                        background: active ? "#2a2f3e" : "transparent",
                        border: "none",
                        color: active ? "#4f9eff" : "#888",
                        cursor: "pointer",
                        padding: "0.05rem 0.3rem",
                        borderRadius: 2,
                        textAlign: "left",
                        display: "block",
                        fontSize: "0.68rem",
                        fontFamily: "monospace",
                      }}
                    >
                      📄 {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
