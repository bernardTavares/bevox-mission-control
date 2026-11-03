"use client";

export interface RoadmapDocEntry {
  path: string;
  name: string;
  modified_at: string;
  is_stub: boolean;
}

export interface RoadmapDocsListProps {
  docs: RoadmapDocEntry[];
  selected: string | null;
  onSelect: (path: string) => void;
}

/** Lista clicavel de roadmap docs com badge stub. */
export function RoadmapDocsList({ docs, selected, onSelect }: RoadmapDocsListProps) {
  if (docs.length === 0) {
    return <div style={{ color: "#666", fontSize: "0.7rem", fontStyle: "italic" }}>Nenhum roadmap doc.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      {docs.map((doc) => {
        const active = doc.path === selected;
        return (
          <button
            key={doc.path}
            type="button"
            onClick={() => onSelect(doc.path)}
            style={{
              background: active ? "#2a2f3e" : "transparent",
              border: "none",
              padding: "0.3rem 0.45rem",
              borderRadius: 3,
              color: active ? "#4f9eff" : "#888",
              fontSize: "0.7rem",
              fontFamily: "monospace",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>📄 {doc.name}</span>
            {doc.is_stub && (
              <span style={{ background: "#5f5a1e", color: "#e4dc6e", padding: "0 0.25rem", borderRadius: 2, fontSize: "0.55rem" }}>
                stub
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
