"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Circle,
  MessageSquare,
  HardDrive,
  Shield,
  Users,
  Activity,
  ExternalLink,
  GitBranch,
  LayoutGrid,
  FileText,
} from "lucide-react";
import { AgentOrganigrama } from "@/components/AgentOrganigrama";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  model: string;
  workspace: string;
  dmPolicy?: string;
  allowAgents: string[];
  allowAgentsDetails?: Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
  }>;
  botToken?: string;
  status: "online" | "offline";
  lastActivity?: string;
  activeSessions: number;
}

// E2 — Canonical Agents Projection
interface CanonicalAgent {
  id: string;
  status: string;
  level: string;
  owner: string;
  model: { primary: string; fallback: string };
  since: string;
  file: string;
}

interface CanonicalAgentsResponse {
  generated_at: string;
  source: string;
  version: number;
  agents: CanonicalAgent[];
  total: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"cards" | "organigrama">("cards");
  // E2 — top-level tabs (Runtime | Hub-dispatch) + canonical state
  const [topLevelTab, setTopLevelTab] = useState<"runtime" | "hub-dispatch">("runtime");
  const [canonical, setCanonical] = useState<CanonicalAgentsResponse | null>(null);
  // E2 detail+edit drawer state
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [detailContent, setDetailContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [detailAgent, setDetailAgent] = useState<CanonicalAgent | null>(null);
  const [detailFilePath, setDetailFilePath] = useState<string>("");
  const [detailFileSize, setDetailFileSize] = useState<number>(0);
  const [detailFileModified, setDetailFileModified] = useState<string>("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  // E2 — parallel fetch of canonical agents list (silent on error).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/agents/canonical")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CanonicalAgentsResponse | null) => !cancelled && setCanonical(d))
      .catch(() => !cancelled && setCanonical(null));
    return () => {
      cancelled = true;
    };
  }, []);

  // E2 — fetch agent detail when drawer opens
  useEffect(() => {
    if (!selectedAgentId) return;
    let cancelled = false;
    setDetailLoading(true);
    setSaveMessage(null);
    setDetailAgent(null);
    setDetailContent("");
    setOriginalContent("");
    setDetailFilePath("");
    setDetailFileSize(0);
    setDetailFileModified("");
    fetch(`/api/agents/canonical/${selectedAgentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: any) => {
        if (cancelled) return;
        setDetailAgent(d.agent);
        setDetailContent(d.content);
        setOriginalContent(d.content);
        setDetailFilePath(d.file_path);
        setDetailFileSize(d.file_size);
        setDetailFileModified(d.file_modified);
      })
      .catch(() => {
        if (cancelled) return;
        setDetailAgent(null);
        setDetailContent("");
        setOriginalContent("");
        setDetailFilePath("");
        setDetailFileSize(0);
        setDetailFileModified("");
      })
      .finally(() => !cancelled && setDetailLoading(false));
    return () => { cancelled = true; };
  }, [selectedAgentId]);

  const dirty = detailContent !== originalContent;

  const handleSave = async () => {
    if (!selectedAgentId || !dirty) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/agents/canonical/${selectedAgentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: detailContent }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        setSaveMessage(`Error: ${err.error || res.status}`);
        return;
      }
      const data = await res.json();
      setOriginalContent(detailContent);
      setDetailFileSize(data.bytes_written);
      setDetailFileModified(data.modified_at);
      setSaveMessage("saved");
    } catch (e) {
      setSaveMessage(`Error: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDrawer = () => {
    if (dirty) {
      if (!window.confirm("Discard unsaved changes?")) return;
    }
    setSelectedAgentId(null);
    setDetailAgent(null);
    setDetailContent("");
    setOriginalContent("");
    setDetailFilePath("");
    setDetailFileSize(0);
    setDetailFileModified("");
    setSaveMessage(null);
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-lg" style={{ color: "var(--text-muted)" }}>
            Loading agents...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--text-primary)",
            letterSpacing: "-1.5px",
          }}
        >
          <Users className="inline-block w-8 h-8 mr-2 mb-1" />
          Agents
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Multi-agent system overview • {agents.length} runtime / {canonical?.total ?? 0} canonical
        </p>
      </div>

      {/* E2 — Top-level tabs: Runtime | Hub-dispatch */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        {([
          { id: "runtime" as const, label: `Runtime (${agents.length})` },
          {
            id: "hub-dispatch" as const,
            label: `Hub-dispatch (${canonical?.total ?? 0})`,
          },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTopLevelTab(id)}
            className="flex items-center gap-2 px-4 py-2 font-medium transition-all"
            style={{
              color: topLevelTab === id ? "var(--accent)" : "var(--text-secondary)",
              borderBottom: topLevelTab === id ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderBottomStyle: "solid",
              borderBottomWidth: "2px",
              borderBottomColor: topLevelTab === id ? "var(--accent)" : "transparent",
              paddingBottom: "0.5rem",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {topLevelTab === "runtime" && (
      <>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        {[
          { id: "cards" as const, label: "Agent Cards", icon: LayoutGrid },
          { id: "organigrama" as const, label: "Organigrama", icon: GitBranch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 font-medium transition-all"
            style={{
              color: activeTab === id ? "var(--accent)" : "var(--text-secondary)",
              borderBottom: activeTab === id ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none", border: "none", cursor: "pointer",
              borderBottomStyle: "solid",
              borderBottomWidth: "2px",
              borderBottomColor: activeTab === id ? "var(--accent)" : "transparent",
              paddingBottom: "0.5rem",
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Organigrama View */}
      {activeTab === "organigrama" && (
        <div className="rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Agent Hierarchy</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Visualization of agent communication allowances</p>
          </div>
          <AgentOrganigrama agents={agents} />
        </div>
      )}

      {/* Agents Grid */}
      {activeTab === "cards" && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Header with status */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{
                borderBottom: "1px solid var(--border)",
                background: `linear-gradient(135deg, ${agent.color}15, transparent)`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{
                    backgroundColor: `${agent.color}20`,
                    border: `2px solid ${agent.color}`,
                  }}
                >
                  {agent.emoji}
                </div>
                <div>
                  <h3
                    className="text-lg font-bold"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {agent.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Circle
                      className="w-2 h-2"
                      style={{
                        fill: agent.status === "online" ? "#4ade80" : "#6b7280",
                        color: agent.status === "online" ? "#4ade80" : "#6b7280",
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{
                        color:
                          agent.status === "online"
                            ? "#4ade80"
                            : "var(--text-muted)",
                      }}
                    >
                      {agent.status}
                    </span>
                  </div>
                </div>
              </div>

              {agent.botToken && (
                <div title="Telegram Bot Connected">
                  <MessageSquare
                    className="w-5 h-5"
                    style={{ color: "#0088cc" }}
                  />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-5 space-y-4">
              {/* Model */}
              <div className="flex items-start gap-3">
                <Bot className="w-4 h-4 mt-0.5" style={{ color: agent.color }} />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-medium mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Model
                  </div>
                  <div
                    className="text-sm font-mono truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {agent.model}
                  </div>
                </div>
              </div>

              {/* Workspace */}
              <div className="flex items-start gap-3">
                <HardDrive
                  className="w-4 h-4 mt-0.5"
                  style={{ color: agent.color }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-medium mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Workspace
                  </div>
                  <div
                    className="text-sm font-mono truncate"
                    style={{ color: "var(--text-primary)" }}
                    title={agent.workspace}
                  >
                    {agent.workspace}
                  </div>
                </div>
              </div>

              {/* DM Policy */}
              {agent.dmPolicy && (
                <div className="flex items-start gap-3">
                  <Shield
                    className="w-4 h-4 mt-0.5"
                    style={{ color: agent.color }}
                  />
                  <div className="flex-1">
                    <div
                      className="text-xs font-medium mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      DM Policy
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {agent.dmPolicy}
                    </div>
                  </div>
                </div>
              )}

              {/* Subagents */}
              {agent.allowAgents.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users
                    className="w-4 h-4 mt-0.5"
                    style={{ color: agent.color }}
                  />
                  <div className="flex-1">
                    <div
                      className="text-xs font-medium mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Can spawn subagents ({agent.allowAgents.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.allowAgentsDetails && agent.allowAgentsDetails.length > 0 ? (
                        agent.allowAgentsDetails.map((subagent) => (
                          <div
                            key={subagent.id}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
                            style={{
                              backgroundColor: `${subagent.color}15`,
                              border: `1px solid ${subagent.color}40`,
                            }}
                            title={`${subagent.name} (${subagent.id})`}
                          >
                            <span className="text-sm">{subagent.emoji}</span>
                            <span
                              style={{
                                color: subagent.color,
                                fontWeight: 600,
                              }}
                            >
                              {subagent.name}
                            </span>
                          </div>
                        ))
                      ) : (
                        agent.allowAgents.map((subagent) => (
                          <span
                            key={subagent}
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              backgroundColor: `${agent.color}20`,
                              color: agent.color,
                              fontWeight: 500,
                            }}
                          >
                            {subagent}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Last Activity */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Last activity: {formatLastActivity(agent.lastActivity)}
                  </span>
                </div>
                {agent.activeSessions > 0 && (
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: "var(--success)20",
                      color: "var(--success)",
                    }}
                  >
                    {agent.activeSessions} active
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
      </>
      )}

      {topLevelTab === "hub-dispatch" && (
      <>
      {/* E2 — Hub-dispatch canonical agents (read-only, boundary forte) */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          fontSize: "13px",
          lineHeight: "1.6",
          color: "var(--text-secondary)",
        }}
      >
        <strong style={{ color: "var(--text-primary)" }}>
          Agents canônicos do <code>bevox-knowledge</code>.
        </strong>{" "}
        Estes agents não rodam como sessões runtime separadas — o Vox (main)
        atende às requisições quando caem no domínio deles, via modo{" "}
        <strong>Hub-dispatch</strong> (E10 wave 1 §2.2, ADR-003). Edição
        canônica é via <code>vim 20_architecture/agents/&lt;file&gt;</code>{" "}
        + <code>git commit</code>, não pelo MC.
      </div>

      {canonical === null && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: "13px",
          }}
        >
          Não foi possível carregar agents canônicos. Verifique se{" "}
          <code>BEVOX_KNOWLEDGE_DIR</code> está configurado no{" "}
          <code>.env.local</code> do Mission Control.
        </div>
      )}

      {canonical !== null && canonical.agents.length === 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: "13px",
          }}
        >
          Nenhum agent canônico com <code>status: ativo</code>.
        </div>
      )}

      {canonical !== null && canonical.agents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {canonical.agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <div
                className="px-5 py-4 flex items-start justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <FileText
                    className="w-8 h-8"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <div>
                    <h3
                      className="text-lg font-bold"
                      style={{
                        fontFamily: "var(--font-heading)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {agent.id}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: "var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        canonical
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: "var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        served via Vox
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: "var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {agent.level}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="px-5 py-3 text-sm space-y-1"
                style={{ color: "var(--text-secondary)" }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)" }}>owner:</span>{" "}
                  {agent.owner}
                  {"  ·  "}
                  <span style={{ color: "var(--text-muted)" }}>since:</span>{" "}
                  {agent.since}
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>primary:</span>{" "}
                  <code style={{ fontSize: "12px" }}>{agent.model.primary}</code>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>fallback:</span>{" "}
                  <code style={{ fontSize: "12px" }}>{agent.model.fallback}</code>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>file:</span>{" "}
                  <code style={{ fontSize: "12px" }}>{agent.file}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canonical !== null && (
        <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          source: <code>{canonical.source}</code>
          {" · "}
          generated_at: <code>{canonical.generated_at}</code>
          {" · "}
          version: <code>{canonical.version}</code>
        </div>
      )}
      </>
      )}

      {/* E2 — Agent detail drawer (canonical .md edit) */}
      {selectedAgentId !== null && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={handleCloseDrawer}
          />
          {/* Drawer panel */}
          <div
            className="fixed top-0 right-0 z-50 h-full flex flex-col"
            style={{
              width: "65%",
              minWidth: "500px",
              maxWidth: "900px",
              backgroundColor: "var(--background)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-4px 0 20px rgba(0,0,0,0.2)",
            }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--text-primary)",
                  }}
                >
                  {detailAgent?.id || selectedAgentId}
                </h2>
                {detailAgent && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      {detailAgent.level}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      canonical
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      owner: {detailAgent.owner} · since: {detailAgent.since}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleCloseDrawer}
                className="p-2 rounded hover:bg-[var(--border)]"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Content area */}
            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <span style={{ color: "var(--text-muted)" }}>Loading...</span>
              </div>
            ) : (
              <textarea
                className="flex-1 p-6 resize-none outline-none"
                style={{
                  fontFamily: "var(--font-jetbrains, monospace)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  backgroundColor: "var(--background)",
                  color: "var(--text-primary)",
                  border: "none",
                }}
                value={detailContent}
                onChange={(e) => setDetailContent(e.target.value)}
              />
            )}

            {/* Footer */}
            <div
              className="px-6 py-3 flex items-center justify-between shrink-0"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="px-4 py-1.5 rounded font-medium text-sm transition-all"
                  style={{
                    backgroundColor: dirty ? "var(--accent)" : "var(--border)",
                    color: dirty ? "#fff" : "var(--text-muted)",
                    cursor: dirty ? "pointer" : "not-allowed",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                {saveMessage === "saved" && (
                  <span className="text-sm" style={{ color: "var(--success, #4ade80)" }}>
                    Saved ✓ — Changes not committed. Run{" "}
                    <code style={{ fontSize: "11px" }}>git add + commit + push</code>{" "}
                    in <code style={{ fontSize: "11px" }}>~/bevox-knowledge</code>.
                  </span>
                )}
                {saveMessage && saveMessage !== "saved" && (
                  <span className="text-sm" style={{ color: "var(--error, #ef4444)" }}>
                    {saveMessage}
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {detailFilePath && (
                  <>
                    <code>{detailAgent?.file}</code>
                    {" · "}
                    {detailFileSize} bytes
                    {" · "}
                    {detailFileModified}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
