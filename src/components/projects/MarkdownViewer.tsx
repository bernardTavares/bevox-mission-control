"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownViewerProps {
  source: string;
  filename: string;
  stub?: boolean;
  onRawClick?: () => void;
}

/**
 * Markdown viewer com header (filename + stub badge + raw button) + body
 * renderizado via react-markdown + remark-gfm. Theme dark coerente com MC.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.3
 */
export function MarkdownViewer({ source, filename, stub, onRawClick }: MarkdownViewerProps) {
  return (
    <div style={{ background: "#1a2230", borderRadius: 6, overflow: "hidden", height: "100%" }}>
      <div style={{
        background: "#161b22",
        padding: "0.5rem 0.85rem",
        borderBottom: "1px solid #2a2f3e",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ color: "#888", fontSize: "0.7rem", fontFamily: "monospace" }}>
          📄 {filename}
        </span>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {stub && (
            <span style={{
              background: "#5f5a1e",
              color: "#e4dc6e",
              padding: "0.1rem 0.4rem",
              borderRadius: 3,
              fontSize: "0.6rem",
            }}>stub</span>
          )}
          {onRawClick && (
            <button
              type="button"
              onClick={onRawClick}
              style={{
                background: "transparent",
                border: "none",
                color: "#666",
                fontSize: "0.65rem",
                cursor: "pointer",
              }}
            >↗ raw</button>
          )}
        </div>
      </div>
      <div className="markdown-body" style={{ padding: "1.25rem", color: "#e0e0e0", lineHeight: 1.65, fontSize: "0.85rem", overflow: "auto" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
      </div>
    </div>
  );
}
