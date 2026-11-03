"use client";

import { useEffect, useState } from "react";
import { Copy, Check, X, Clock, Archive, ExternalLink } from "lucide-react";

interface GithubLink {
  state: "linked" | "failed";
  repo: string | null;
  issue_number: number | null;
  issue_url: string | null;
  error_kind: string | null;
  message: string | null;
  last_attempt_at: string;
  last_attempt_event: string;
}

interface Proposal {
  proposal_id?: string;
  key: string;
  spec_path: string;
  section_id: string;
  item_text: string;
  state: "pending" | "accepted" | "rejected" | "expired";
  proposed_at: string;
  resolved_at: string | null;
  resolved_reason: string | null;
  task_id: string | null;
  github_link: GithubLink | null; // NEW (E6)
}

interface DeliveryState {
  schema_version: number;
  generated_at: string | null;
  active_specs: Record<string, { activated_at: string; activated_by_event: string }>;
  proposals: Record<string, Proposal>;
  last_scan: {
    run_id: string;
    finished_at: string;
    specs_scanned: number;
    proposals_emitted: number;
  } | null;
}

type TabName = "pending" | "accepted" | "rejected" | "expired";

const TABS: { key: TabName; label: string; icon: typeof Clock }[] = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "accepted", label: "Accepted", icon: Check },
  { key: "rejected", label: "Rejected", icon: X },
  { key: "expired", label: "Expired", icon: Archive },
];

export default function DeliveryPage() {
  const [state, setState] = useState<DeliveryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("pending");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/delivery/state")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error((body as { detail?: string }).detail || `HTTP ${r.status}`);
        }
        return r.json() as Promise<DeliveryState>;
      })
      .then((data) => {
        if (!cancelled) {
          setState(data);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const proposalsForTab = state
    ? Object.entries(state.proposals)
        .map(([pid, p]) => ({ ...p, proposal_id: pid }))
        .filter((p) => p.state === activeTab)
        .sort((a, b) => (a.proposed_at < b.proposed_at ? 1 : -1))
    : [];

  const counts: Record<TabName, number> = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
  };
  if (state) {
    for (const p of Object.values(state.proposals)) {
      const s = p.state as TabName;
      counts[s] = (counts[s] || 0) + 1;
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {
      console.error("clipboard write failed:", e);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Loading delivery state...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6">
        <h1
          className="text-2xl font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Delivery
        </h1>
        <div
          className="p-4 rounded border text-sm"
          style={{
            backgroundColor: "var(--card-elevated)",
            borderColor: "var(--error)",
            color: "var(--error)",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }
  if (!state) return null;

  return (
    <div className="p-6">
      <h1
        className="text-2xl font-semibold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        Delivery
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        E5 wave 1 — proposals from {Object.keys(state.active_specs).length} active spec(s).
        {state.last_scan && (
          <>
            {" "}Last scan: {state.last_scan.proposals_emitted} new from{" "}
            {state.last_scan.specs_scanned} spec(s).
          </>
        )}
      </p>


      {/* Tabs */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2 flex items-center gap-2 text-sm"
            style={{
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: activeTab === key ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: "-1px",
              color: activeTab === key ? "var(--accent)" : "var(--text-muted)",
              fontWeight: activeTab === key ? 600 : 400,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <Icon className="w-4 h-4" />
            {label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {proposalsForTab.length === 0 ? (
        <div className="text-sm py-12 text-center" style={{ color: "var(--text-muted)" }}>
          No {activeTab} proposals.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead
              className="text-left"
              style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <tr>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Spec</th>
                <th className="py-2 pr-4">Section</th>
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Proposed at</th>
                {activeTab === "pending" && <th className="py-2 pr-4">Action</th>}
                {activeTab === "rejected" && <th className="py-2 pr-4">Reason</th>}
                {activeTab === "accepted" && <th className="py-2 pr-4">Issue</th>}
              </tr>
            </thead>
            <tbody>
              {proposalsForTab.map((p) => {
                const shortId = (p.proposal_id || "").substring(0, 12);
                const specBase = p.spec_path.split("/").pop() || p.spec_path;
                return (
                  <tr
                    key={p.proposal_id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                        "var(--card-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                    }}
                  >
                    <td
                      className="py-2 pr-4 font-mono text-xs"
                      title={p.proposal_id}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {shortId}
                    </td>
                    <td className="py-2 pr-4" title={p.spec_path} style={{ color: "var(--text-primary)" }}>
                      {specBase}
                    </td>
                    <td className="py-2 pr-4" style={{ color: "var(--text-primary)" }}>
                      {p.section_id}
                    </td>
                    <td
                      className="py-2 pr-4 max-w-md truncate"
                      title={p.item_text}
                      style={{ color: "var(--text-primary)" }}
                    >
                      {p.item_text}
                    </td>
                    <td className="py-2 pr-4 text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(p.proposed_at).toLocaleString()}
                    </td>
                    {activeTab === "pending" && (
                      <td className="py-2 pr-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              copyToClipboard(
                                `openclaw-delivery accept ${shortId}`,
                                `accept-${p.proposal_id}`
                              )
                            }
                            className="px-2 py-1 text-xs rounded flex items-center gap-1"
                            style={{
                              border: "1px solid var(--border)",
                              color: "var(--text-secondary)",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            title="Copy accept command"
                          >
                            {copiedId === `accept-${p.proposal_id}` ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            accept
                          </button>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                `openclaw-delivery reject ${shortId} --reason "..."`,
                                `reject-${p.proposal_id}`
                              )
                            }
                            className="px-2 py-1 text-xs rounded flex items-center gap-1"
                            style={{
                              border: "1px solid var(--border)",
                              color: "var(--text-secondary)",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            title="Copy reject command"
                          >
                            {copiedId === `reject-${p.proposal_id}` ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            reject
                          </button>
                        </div>
                      </td>
                    )}
                    {activeTab === "rejected" && (
                      <td
                        className="py-2 pr-4 text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {p.resolved_reason || "—"}
                      </td>
                    )}
                    {activeTab === "accepted" && (
                      <td className="py-2 pr-4">
                        {p.github_link === null ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : p.github_link.state === "linked" ? (
                          <a
                            href={p.github_link.issue_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1"
                          >
                            #{p.github_link.issue_number}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span
                              className="text-xs text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded"
                              title={`${p.github_link.error_kind}: ${p.github_link.message || ""}`}
                            >
                              link failed
                            </span>
                            {p.github_link.error_kind === "repo_unresolved" ? (
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    `openclaw-delivery set-spec-repo ${p.spec_path} --repo <owner/name>`,
                                    `setrepo-${p.proposal_id}`
                                  )
                                }
                                className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-50 flex items-center gap-1"
                                title="Copy set-spec-repo command (replace <owner/name>)"
                              >
                                {copiedId === `setrepo-${p.proposal_id}` ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                set repo
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    `openclaw-delivery github-link ${p.task_id}`,
                                    `retry-${p.proposal_id}`
                                  )
                                }
                                className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-50 flex items-center gap-1"
                                title="Copy retry command"
                              >
                                {copiedId === `retry-${p.proposal_id}` ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                retry
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
