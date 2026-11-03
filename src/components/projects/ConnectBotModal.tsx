"use client";

import { useEffect, useState } from "react";

export interface ConnectBotModalProps {
  open: boolean;
  projectId: string;
  projectName: string;
  defaultAllowFrom: string[];
  availableSkills: string[];
  onClose: () => void;
  onSuccess: (payload: { bot_username: string; port: number }) => void;
}

type Result =
  | { kind: "success"; bot_username: string; port: number }
  | { kind: "error"; message: string };

export function ConnectBotModal({
  open,
  projectId,
  projectName,
  defaultAllowFrom,
  availableSkills,
  onClose,
  onSuccess,
}: ConnectBotModalProps) {
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [allowFrom, setAllowFrom] = useState(defaultAllowFrom.join(", "));
  const [skills, setSkills] = useState<Set<string>>(
    new Set(["knowledge-sync-commands"]),
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!open) {
      setToken("");
      setChatId("");
      setAllowFrom(defaultAllowFrom.join(", "));
      setSkills(new Set(["knowledge-sync-commands"]));
      setSubmitting(false);
      setResult(null);
    }
  }, [open, defaultAllowFrom]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const tokenOk = /^\d+:[A-Za-z0-9_-]{30,}$/.test(token);
  const chatIdOk = /^-?\d+$/.test(chatId.trim());
  const allowOk = allowFrom.split(",").map((s) => s.trim()).filter(Boolean).every((u) => /^\d+$/.test(u));
  const canSubmit = !submitting && tokenOk && chatIdOk && allowOk && skills.size > 0;

  const toggleSkill = (slug: string) => {
    if (slug === "knowledge-sync-commands") return; // forced
    setSkills((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/bot/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          chat_id: Number(chatId.trim()),
          allow_from: allowFrom.split(",").map((s) => s.trim()).filter(Boolean),
          skills: Array.from(skills),
        }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setResult({ kind: "success", bot_username: data.bot_username, port: data.port });
        setTimeout(() => onSuccess({ bot_username: data.bot_username, port: data.port }), 2000);
      } else {
        setResult({
          kind: "error",
          message: data.detail ?? data.error ?? `HTTP ${r.status}`,
        });
      }
    } catch (e) {
      setResult({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={submitting ? undefined : onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#161b22", borderRadius: 8, padding: "1.25rem 1.5rem",
        width: "90%", maxWidth: 560, color: "#e0e0e0",
        border: "1px solid #2a2f3e",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Connect Telegram bot — {projectName}</h2>
          {!submitting && (
            <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#888", fontSize: "1.4rem", cursor: "pointer" }}>×</button>
          )}
        </div>

        {!result && (
          <>
            <div style={{ fontSize: "0.78rem", color: "#888", lineHeight: 1.6, marginBottom: "1rem" }}>
              Pré-requisitos (faça antes):
              <ol style={{ margin: "0.3rem 0 0", paddingLeft: "1.4rem" }}>
                <li>@BotFather → /newbot → guardar TOKEN</li>
                <li>Criar grupo Telegram → adicionar bot como admin</li>
                <li>Pegar CHAT_ID (forward msg para @userinfobot)</li>
              </ol>
            </div>

            <Field label="Bot token (BotFather)">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={submitting}
                placeholder="1234567890:AAEhBP..."
                style={inputStyle(token === "" ? "neutral" : tokenOk ? "ok" : "err")}
              />
            </Field>

            <Field label="Chat ID (grupo Telegram)">
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                disabled={submitting}
                placeholder="-1001234567890"
                style={inputStyle(chatId === "" ? "neutral" : chatIdOk ? "ok" : "err")}
              />
            </Field>

            <Field label="Allow from (Telegram user_ids, vírgula)">
              <input
                type="text"
                value={allowFrom}
                onChange={(e) => setAllowFrom(e.target.value)}
                disabled={submitting}
                placeholder="123456789"
                style={inputStyle(allowFrom === "" ? "neutral" : allowOk ? "ok" : "err")}
              />
            </Field>

            <Field label="Skills">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", padding: "0.4rem 0.6rem", background: "#1a2230", borderRadius: 4, border: "1px solid #2a2f3e" }}>
                {availableSkills.map((slug) => {
                  const forced = slug === "knowledge-sync-commands";
                  return (
                    <label key={slug} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: forced ? "#888" : "#e0e0e0", cursor: forced ? "not-allowed" : "pointer" }}>
                      <input
                        type="checkbox"
                        checked={skills.has(slug)}
                        disabled={forced || submitting}
                        onChange={() => toggleSkill(slug)}
                      />
                      <code style={{ fontSize: "0.78rem" }}>{slug}</code>
                      {forced && <span style={{ fontSize: "0.7rem", color: "#666" }}>(default)</span>}
                    </label>
                  );
                })}
              </div>
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" onClick={onClose} disabled={submitting} style={btnSecondary}>Cancel</button>
              <button type="button" onClick={submit} disabled={!canSubmit} style={btnPrimary(canSubmit)}>
                {submitting ? "Connecting…" : "Connect bot"}
              </button>
            </div>
          </>
        )}

        {result?.kind === "success" && (
          <div style={{ background: "#1e3a30", color: "#7ec896", padding: "1rem", borderRadius: 4, fontSize: "0.85rem" }}>
            ✓ Connected as <strong>@{result.bot_username}</strong> on port {result.port}.
          </div>
        )}
        {result?.kind === "error" && (
          <div style={{ background: "#3f1e1e", color: "#e46e6e", padding: "1rem", borderRadius: 4, fontSize: "0.82rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>✗ Connect failed</div>
            <div>{result.message}</div>
            <button type="button" onClick={() => setResult(null)} style={{ ...btnSecondary, marginTop: "0.6rem" }}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "0.6rem" }}>
      <div style={{ color: "#888", fontSize: "0.7rem", marginBottom: "0.2rem" }}>{label}</div>
      {children}
    </label>
  );
}

function inputStyle(state: "neutral" | "ok" | "err"): React.CSSProperties {
  const border = state === "ok" ? "#1e3a30" : state === "err" ? "#5f1e1e" : "#2a2f3e";
  return {
    width: "100%", padding: "0.45rem 0.6rem",
    background: "#1a2230",
    border: `1px solid ${border}`,
    borderRadius: 4, color: "#e0e0e0", fontSize: "0.85rem",
    fontFamily: "monospace",
  };
}

const btnSecondary: React.CSSProperties = {
  background: "transparent", border: "1px solid #2a2f3e",
  color: "#888", padding: "0.4rem 0.85rem", borderRadius: 4,
  fontSize: "0.85rem", cursor: "pointer",
};

function btnPrimary(canSubmit: boolean): React.CSSProperties {
  return {
    background: canSubmit ? "#1e3a5f" : "#2a2f3e",
    color: canSubmit ? "#6ec1e4" : "#666",
    border: canSubmit ? "1px solid #2e4a6f" : "none",
    padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: "0.85rem",
    cursor: canSubmit ? "pointer" : "not-allowed",
  };
}
