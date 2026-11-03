"use client";

import { useState } from "react";

export interface BotStatus {
  connected: true;
  bot_username: string | null;
  chat_id: number | null;
  port: number | null;
  active_state: "active" | "failed" | "inactive";
  skills: string[];
}

export interface BotPanelProps {
  projectId: string;
  status: BotStatus;
  onChanged: () => void; // refetch parent
}

function maskChatId(n: number | null): string {
  if (n === null) return "—";
  const s = String(n);
  if (s.length <= 6) return s;
  return s.slice(0, 4) + "•".repeat(Math.max(2, s.length - 6)) + s.slice(-2);
}

export function BotPanel({ projectId, status, onChanged }: BotPanelProps) {
  const [busy, setBusy] = useState<"restart" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [topicsResult, setTopicsResult] = useState<{
    created: string[];
    existing: string[];
    failed: Array<{ topic: string; error: string }>;
  } | null>(null);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const dot = status.active_state === "active" ? "#7ec896"
    : status.active_state === "failed" ? "#e46e6e"
    : "#888";

  const restart = async () => {
    if (!confirm(`Reiniciar bot @${status.bot_username}?`)) return;
    setBusy("restart");
    setError(null);
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/bot/restart`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${r.status}`);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onInitTopics = async () => {
    setInitializing(true);
    setTopicsError(null);
    setTopicsResult(null);
    try {
      const r = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/telegram/init-topics`,
        { method: "POST" },
      );
      const json = (await r.json()) as Record<string, unknown>;
      if (!r.ok || (typeof json.error === "string" && json.error)) {
        setTopicsError(
          (typeof json.error === "string" ? json.error : null)
          ?? `HTTP ${r.status}`,
        );
      } else {
        setTopicsResult({
          created: Array.isArray(json.created) ? (json.created as string[]) : [],
          existing: Array.isArray(json.existing) ? (json.existing as string[]) : [],
          failed: Array.isArray(json.failed)
            ? (json.failed as Array<{ topic: string; error: string }>)
            : [],
        });
      }
    } catch (e) {
      setTopicsError(e instanceof Error ? e.message : String(e));
    } finally {
      setInitializing(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("O bot será parado e o vínculo removido.\nO workspace permanece — pode reconectar depois.\n\nProsseguir?")) return;
    setBusy("disconnect");
    setError(null);
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/bot`, { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${r.status}`);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{
      background: "#1a2230", border: "1px solid #2a2f3e",
      borderRadius: 6, padding: "0.9rem 1rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: dot, display: "inline-block" }} />
        <span style={{ fontSize: "0.78rem", color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{status.active_state}</span>
        <strong style={{ fontSize: "0.92rem" }}>@{status.bot_username ?? "(unknown)"}</strong>
      </div>
      <dl style={{ margin: 0, fontSize: "0.78rem", color: "#888", lineHeight: 1.7 }}>
        <Row label="Chat ID">{maskChatId(status.chat_id)}</Row>
        <Row label="Port">{status.port ?? "—"}</Row>
        <Row label="Skills">
          {status.skills.length === 0
            ? "—"
            : status.skills.map((s) => (
                <code key={s} style={{ fontSize: "0.74rem", marginRight: "0.4rem" }}>{s}</code>
              ))}
        </Row>
      </dl>
      {error && (
        <div style={{ background: "#3f1e1e", color: "#e46e6e", padding: "0.5rem 0.7rem", borderRadius: 4, fontSize: "0.78rem", margin: "0.6rem 0 0" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
        <button type="button" onClick={restart} disabled={busy !== null} style={btnSecondary}>
          {busy === "restart" ? "Restarting…" : "Restart"}
        </button>
        <button type="button" onClick={disconnect} disabled={busy !== null} style={btnDanger}>
          {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
      <div style={{ marginTop: "0.8rem", paddingTop: "0.8rem", borderTop: "1px solid #2a2f3e" }}>
        <button
          type="button"
          onClick={onInitTopics}
          disabled={initializing}
          style={{
            background: "#1e3a5f",
            color: "#6ec1e4",
            border: "1px solid #2e4a6f",
            padding: "0.4rem 0.85rem",
            borderRadius: 4,
            fontSize: "0.85rem",
            cursor: initializing ? "wait" : "pointer",
            opacity: initializing ? 0.6 : 1,
          }}
        >
          {initializing ? "Criando tópicos…" : "Initialize topics"}
        </button>
        <p style={{ color: "#888", fontSize: "0.72rem", marginTop: "0.4rem", lineHeight: 1.4 }}>
          Cria os tópicos canônicos (<code>clarifications</code>, <code>dispatcher</code>)
          {" "}no grupo Telegram. Bot precisa ser admin com permissão &quot;Manage topics&quot;.
          Idempotente — tópicos existentes são preservados.
        </p>

        {topicsResult && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", lineHeight: 1.5 }}>
            {topicsResult.created.length > 0 && (
              <p style={{ color: "#7ec896", margin: 0 }}>
                ✓ Criados: {topicsResult.created.join(", ")}
              </p>
            )}
            {topicsResult.existing.length > 0 && (
              <p style={{ color: "#888", margin: 0 }}>
                ○ Já existiam: {topicsResult.existing.join(", ")}
              </p>
            )}
            {topicsResult.failed.length > 0 && (
              <p style={{ color: "#e46e6e", margin: 0 }}>
                ✗ Falhas:{" "}
                {topicsResult.failed
                  .map((f) => `${f.topic} (${f.error})`)
                  .join(", ")}
              </p>
            )}
          </div>
        )}

        {topicsError && (
          <p style={{ color: "#e46e6e", fontSize: "0.78rem", marginTop: "0.5rem" }}>
            Erro: {topicsError}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <dt style={{ width: 80, color: "#666" }}>{label}</dt>
      <dd style={{ margin: 0, color: "#e0e0e0" }}>{children}</dd>
    </div>
  );
}

const btnSecondary: React.CSSProperties = {
  background: "transparent", border: "1px solid #2a2f3e",
  color: "#888", padding: "0.35rem 0.75rem", borderRadius: 4,
  fontSize: "0.8rem", cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  background: "transparent", border: "1px solid #5f1e1e",
  color: "#e46e6e", padding: "0.35rem 0.75rem", borderRadius: 4,
  fontSize: "0.8rem", cursor: "pointer",
};
