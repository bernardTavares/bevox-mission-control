"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectDetail } from "@/lib/projects/types";
import { MarkdownViewer } from "./MarkdownViewer";
import { DeleteProjectModal } from "./DeleteProjectModal";
import { ConnectBotModal } from "./ConnectBotModal";
import { BotPanel, type BotStatus } from "./BotPanel";

export interface ProjectGeralTabProps {
  detail: ProjectDetail;
}

interface PrdResponse {
  files: Array<{ path: string; name: string; modified_at: string; is_stub: boolean }>;
  latest: { path: string; name: string; content: string; is_stub: boolean } | null;
}

type BotStatusResponse = BotStatus | { connected: false };
interface BotDefaultsResponse {
  vox_allow_from: string[];
  available_skills: string[];
}

/**
 * Split layout: esq info estatica (description/health/stats/links); dir PRD viewer.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.2
 */
export function ProjectGeralTab({ detail }: ProjectGeralTabProps) {
  const [prd, setPrd] = useState<PrdResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingExternal, setEditingExternal] = useState(false);
  const [editGithubUrl, setEditGithubUrl] = useState(detail.github_url ?? "");
  const [savingExternal, setSavingExternal] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Bot connect state
  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);
  const [botStatusError, setBotStatusError] = useState<string | null>(null);
  const [botDefaults, setBotDefaults] = useState<BotDefaultsResponse | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const refetchBotStatus = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(detail.id)}/bot/status`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const reason = typeof (j as Record<string, unknown>).error === "string"
          ? String((j as Record<string, unknown>).error)
          : `HTTP ${r.status}`;
        setBotStatusError(reason);
        return;
      }
      const data = (await r.json()) as BotStatusResponse;
      setBotStatus(data);
      setBotStatusError(null);
    } catch (e) {
      setBotStatusError(e instanceof Error ? e.message : String(e));
    }
  }, [detail.id]);

  useEffect(() => {
    void refetchBotStatus();
  }, [refetchBotStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/system/bot-defaults", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as BotDefaultsResponse;
        if (!cancelled) setBotDefaults(data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveExternal = async () => {
    setSavingExternal(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = {};
      if (editGithubUrl !== (detail.github_url ?? "")) {
        body.github_url = editGithubUrl || null;
      }
      if (Object.keys(body).length === 0) {
        setEditingExternal(false);
        return;
      }
      const r = await fetch(`/api/projects/${encodeURIComponent(detail.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.reason ?? j.detail ?? `HTTP ${r.status}`);
      }
      setEditingExternal(false);
      window.location.reload();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingExternal(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/projects/${encodeURIComponent(detail.id)}/prd`, { cache: "no-store" });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(typeof (j as Record<string, unknown>).detail === "string" ? String((j as Record<string, unknown>).detail) : `HTTP ${r.status}`);
        }
        const data = (await r.json()) as PrdResponse;
        if (!cancelled) { setPrd(data); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [detail.id]);

  return (
    <>
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1rem", marginTop: "1rem" }}>
      {/* LEFT */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <InfoBox label="Description">
          <div style={{ color: "#e0e0e0", fontSize: "0.78rem", lineHeight: 1.5 }}>{detail.description}</div>
        </InfoBox>
        <InfoBox label="Health">
          <div style={{ color: "#888", fontSize: "0.72rem", lineHeight: 1.7 }}>
            <DotLine label="Bot" status={detail.health.bot} />
            <DotLine label="Workspace" status={detail.health.workspace} />
            <DotLine label="Kanban" status={detail.health.kanban} />
            <DotLine label="Docs" status={detail.health.knowledge} />
          </div>
        </InfoBox>
        <InfoBox label="Stats">
          <div style={{ color: "#888", fontSize: "0.72rem", lineHeight: 1.7 }}>
            <div>📊 {detail.counts.sprints_active} sprint(s) ativo(s)</div>
            <div>🔥 {detail.tasks_in_flight.length} task(s) em flight</div>
          </div>
        </InfoBox>
        <InfoBox label="External links">
          {!editingExternal ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.7rem" }}>
              {detail.links.kanban_filter_url && (
                <a href={detail.links.kanban_filter_url} style={{ color: "#4f9eff", textDecoration: "none" }}>→ /kanban</a>
              )}
              {detail.github_url && (
                <a href={detail.github_url} target="_blank" rel="noreferrer" style={{ color: "#4f9eff", textDecoration: "none" }}>↗ {detail.github_url}</a>
              )}
              {detail.links.workspace_dir && (
                <span style={{ color: "#888", fontFamily: "monospace", fontSize: "0.65rem" }}>workspace: {detail.links.workspace_dir}</span>
              )}
              {detail.links.knowledge_specs_dir && (
                <span style={{ color: "#888", fontFamily: "monospace", fontSize: "0.65rem" }}>specs: {detail.links.knowledge_specs_dir}</span>
              )}
              <button type="button" onClick={() => setEditingExternal(true)} style={{
                marginTop: "0.4rem", background: "transparent", border: "1px solid #2a2f3e",
                color: "#888", padding: "0.2rem 0.5rem", borderRadius: 3, fontSize: "0.65rem", cursor: "pointer", alignSelf: "flex-start",
              }}>Editar</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.7rem" }}>
              <label>
                <div style={{ color: "#888", fontSize: "0.6rem" }}>github_url</div>
                <input
                  type="url"
                  value={editGithubUrl}
                  onChange={(e) => setEditGithubUrl(e.target.value)}
                  disabled={savingExternal}
                  style={{ width: "100%", padding: "0.3rem 0.4rem", background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: 3, color: "#e0e0e0", fontSize: "0.7rem" }}
                />
              </label>
              {editError && <div style={{ color: "#e46e6e", fontSize: "0.65rem" }}>{editError}</div>}
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button type="button" onClick={saveExternal} disabled={savingExternal} style={{
                  background: "#1e3a5f", color: "#6ec1e4", border: "none",
                  padding: "0.25rem 0.6rem", borderRadius: 3, fontSize: "0.7rem", cursor: "pointer",
                }}>{savingExternal ? "Salvando…" : "Salvar"}</button>
                <button type="button" onClick={() => { setEditingExternal(false); setEditError(null); }} disabled={savingExternal} style={{
                  background: "transparent", color: "#888", border: "1px solid #2a2f3e",
                  padding: "0.25rem 0.6rem", borderRadius: 3, fontSize: "0.7rem", cursor: "pointer",
                }}>Cancelar</button>
              </div>
            </div>
          )}
        </InfoBox>
      </div>

      {/* RIGHT — PRD viewer */}
      <div style={{ minHeight: 400 }}>
        {error && <ErrorPanel message={error} />}
        {!error && !prd && <div style={{ color: "#888", padding: "1rem" }}>Carregando PRD…</div>}
        {!error && prd && !prd.latest && (
          <EmptyPanel
            title="Nenhum PRD pra este projeto"
            hint={`Crie em bevox-knowledge/10_prd/${detail.id}/`}
          />
        )}
        {!error && prd?.latest && (
          <MarkdownViewer
            source={prd.latest.content}
            filename={prd.latest.path}
            stub={prd.latest.is_stub}
          />
        )}
      </div>
    </div>
    <div style={{ marginTop: "2rem", border: "1px solid #2a2f3e", borderRadius: 6, padding: "1rem 1.25rem" }}>
      <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#e0e0e0" }}>Telegram bot</h3>
      <div style={{ marginTop: "0.8rem" }}>
        {botStatusError && (
          <div style={{ color: "#e46e6e", fontSize: "0.78rem" }}>
            Falha ao carregar status do bot: {botStatusError}
          </div>
        )}
        {!botStatusError && botStatus === null && (
          <div style={{ color: "#888", fontSize: "0.78rem" }}>Carregando status…</div>
        )}
        {botStatus?.connected === false && (
          <div>
            <div style={{ color: "#888", fontSize: "0.78rem", lineHeight: 1.6, marginBottom: "0.8rem" }}>
              Não conectado. Antes de conectar, prepare:
              <ol style={{ margin: "0.3rem 0 0", paddingLeft: "1.4rem" }}>
                <li>@BotFather → /newbot → guardar TOKEN</li>
                <li>Criar grupo Telegram → adicionar bot como admin</li>
                <li>Pegar CHAT_ID (forward msg pra @userinfobot)</li>
              </ol>
            </div>
            <button type="button" onClick={() => setConnectOpen(true)} disabled={!botDefaults} style={{
              background: "#1e3a5f", color: "#6ec1e4", border: "1px solid #2e4a6f",
              padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: "0.85rem",
              cursor: botDefaults ? "pointer" : "not-allowed", opacity: botDefaults ? 1 : 0.5,
            }}>Connect bot</button>
          </div>
        )}
        {botStatus?.connected === true && (
          <BotPanel projectId={detail.id} status={botStatus} onChanged={refetchBotStatus} />
        )}
      </div>
    </div>
    {!detail.is_canonical && (
      <div style={{
        marginTop: "2rem",
        border: "1px solid #5f1e1e",
        borderRadius: 6,
        padding: "1rem 1.25rem",
      }}>
        <h3 style={{ color: "#e46e6e", margin: 0, fontSize: "0.95rem" }}>
          ⚠ Danger zone
        </h3>
        <div style={{ color: "#888", fontSize: "0.78rem", lineHeight: 1.5, margin: "0.5rem 0 1rem" }}>
          Esta ação remove o projeto de todos os 7 destinos cross-filesystem. Irreversível.
        </div>
        <button type="button" onClick={() => setDeleteOpen(true)} style={{
          background: "#3f1e1e", color: "#e46e6e", border: "1px solid #5f1e1e",
          padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: "0.85rem",
          cursor: "pointer",
        }}>Delete project</button>
      </div>
    )}
    <DeleteProjectModal
      open={deleteOpen}
      project={detail}
      onClose={() => setDeleteOpen(false)}
      onDeleted={() => router.push("/projects")}
    />
    <ConnectBotModal
      open={connectOpen}
      projectId={detail.id}
      projectName={detail.name}
      defaultAllowFrom={botDefaults?.vox_allow_from ?? []}
      availableSkills={botDefaults?.available_skills ?? ["knowledge-sync-commands"]}
      onClose={() => setConnectOpen(false)}
      onSuccess={() => { setConnectOpen(false); void refetchBotStatus(); }}
    />
    </>
  );
}

function InfoBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#1a2230", padding: "0.7rem", borderRadius: 5 }}>
      <div style={{ color: "#888", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function DotLine({ label, status }: { label: string; status: "ok" | "partial" | "missing" }) {
  const color = status === "ok" ? "#7ec896" : status === "partial" ? "#e4a06e" : "#e46e6e";
  const icon = status === "ok" ? "✓" : status === "partial" ? "⚠" : "✗";
  return <div>{icon} <strong style={{ color }}>{label}</strong></div>;
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div style={{ background: "#3f1e1e", color: "#e46e6e", padding: "1rem", borderRadius: 4 }}>
      Failed to load PRD: {message}
    </div>
  );
}

function EmptyPanel({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ background: "#1a2230", padding: "2rem", borderRadius: 6, textAlign: "center" }}>
      <div style={{ color: "#e4a06e", fontWeight: 600, marginBottom: "0.5rem" }}>{title}</div>
      <div style={{ color: "#888", fontSize: "0.78rem", fontFamily: "monospace" }}>{hint}</div>
    </div>
  );
}
