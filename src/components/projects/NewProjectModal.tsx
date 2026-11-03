"use client";

import { useEffect, useState } from "react";

export interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

const ID_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idStatus, setIdStatus] = useState<{ valid: boolean; reason?: string } | null>(null);

  // Phase 3: PRD input + domain
  const [prdText, setPrdText] = useState("");
  const [prdFile, setPrdFile] = useState<File | null>(null);
  const [domain, setDomain] = useState("");
  const [submitStage, setSubmitStage] = useState<"idle" | "creating" | "persona">("idle");

  useEffect(() => {
    if (!idTouched) setId(slugify(name));
  }, [name, idTouched]);

  useEffect(() => {
    if (!id || !ID_RE.test(id)) {
      setIdStatus({ valid: false, reason: "format" });
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const r = await fetch(`/api/projects/check-id?id=${encodeURIComponent(id)}`);
        const data = await r.json();
        setIdStatus(data);
      } catch { /* ignore network */ }
    }, 300);
    return () => clearTimeout(handle);
  }, [id]);

  useEffect(() => {
    if (!open) {
      setName(""); setId(""); setIdTouched(false);
      setDescription(""); setError(null); setIdStatus(null);
      // Phase 3 resets
      setPrdText(""); setPrdFile(null); setDomain("");
      setSubmitStage("idle");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  // PRD: required; either textarea ≥ 200 chars OR a .md file uploaded
  const prdValid = prdFile !== null || prdText.trim().length >= 200;

  const canSubmit = !submitting
    && name.length >= 2 && name.length <= 50
    && idStatus?.valid === true
    && prdValid;

  const submit = async () => {
    setSubmitting(true);
    setSubmitStage("creating");
    setError(null);

    const fd = new FormData();
    fd.append("name", name);
    fd.append("id", id);
    fd.append("description", description);
    fd.append("domain", domain);
    if (prdFile) {
      fd.append("prd_file", prdFile);
    } else {
      fd.append("prd_text", prdText);
    }

    // After 4s, switch loading text to "Forjando persona Vox..."
    const t = setTimeout(() => setSubmitStage("persona"), 4000);

    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        body: fd, // browser sets Content-Type with boundary automatically
      });
      clearTimeout(t);

      let data: Record<string, unknown> | null = null;
      try {
        data = (await r.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }

      if (!r.ok || !data || data.success === false) {
        const msg =
          (data && (data.error_message || data.detail || data.error)) ||
          `HTTP ${r.status}`;
        throw new Error(String(msg));
      }
      onCreated((data.id as string | undefined) ?? id);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setSubmitting(false);
      setSubmitStage("idle");
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#161b22", borderRadius: 8, padding: "1.25rem 1.5rem",
        width: "90%", maxWidth: 520, color: "#e0e0e0",
        border: "1px solid #2a2f3e",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#4f9eff" }}>Novo projeto</h2>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#888", fontSize: "1.4rem", cursor: "pointer" }}>×</button>
        </div>

        <label style={{ display: "block", marginBottom: "0.6rem" }}>
          <div style={{ color: "#888", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Nome</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            placeholder="Customer Portal"
            style={{ width: "100%", padding: "0.45rem 0.6rem", background: "#1a2230", border: "1px solid #2a2f3e", borderRadius: 4, color: "#e0e0e0", fontSize: "0.9rem" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.6rem" }}>
          <div style={{ color: "#888", fontSize: "0.7rem", marginBottom: "0.2rem" }}>
            ID {idStatus && !idStatus.valid && <span style={{ color: "#e46e6e" }}>· {idStatus.reason}</span>}
          </div>
          <input
            type="text"
            value={id}
            onChange={(e) => { setId(e.target.value); setIdTouched(true); }}
            disabled={submitting}
            placeholder="customer-portal"
            style={{
              width: "100%", padding: "0.45rem 0.6rem",
              background: "#1a2230",
              border: `1px solid ${idStatus && !idStatus.valid ? "#e46e6e" : "#2a2f3e"}`,
              borderRadius: 4, color: "#e0e0e0", fontSize: "0.85rem", fontFamily: "monospace",
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.6rem" }}>
          <div style={{ color: "#888", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Descrição (opcional)</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={2}
            placeholder="App de portal do cliente"
            style={{ width: "100%", padding: "0.45rem 0.6rem", background: "#1a2230", border: "1px solid #2a2f3e", borderRadius: 4, color: "#e0e0e0", fontSize: "0.85rem", resize: "vertical" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.6rem" }}>
          <div style={{ color: "#888", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Domain</div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={submitting}
            style={{ width: "100%", padding: "0.45rem 0.6rem", background: "#1a2230", border: "1px solid #2a2f3e", borderRadius: 4, color: "#e0e0e0", fontSize: "0.85rem" }}
          >
            <option value="">— escolher (opcional)</option>
            <option value="Produto">Produto</option>
            <option value="Ops">Ops</option>
            <option value="Tech">Tech</option>
            <option value="Growth">Growth</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ color: "#888", fontSize: "0.7rem", marginBottom: "0.2rem" }}>
            PRD do projeto <span style={{ color: "#e46e6e" }}>*</span>
          </div>
          <div style={{ color: "#666", fontSize: "0.68rem", marginBottom: "0.35rem", lineHeight: 1.4 }}>
            Cole o PRD (mín. 200 caracteres) ou faça upload de um arquivo .md.
            Será usado para gerar a persona Voz dedicada ao projeto.
          </div>
          <textarea
            rows={6}
            placeholder="Cole o PRD aqui..."
            value={prdText}
            disabled={prdFile !== null || submitting}
            onChange={(e) => setPrdText(e.target.value)}
            style={{ width: "100%", padding: "0.45rem 0.6rem", background: "#1a2230", border: "1px solid #2a2f3e", borderRadius: 4, color: "#e0e0e0", fontSize: "0.78rem", fontFamily: "monospace", resize: "vertical", marginBottom: "0.4rem" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#888" }}>
            <span>ou</span>
            <input
              type="file"
              accept=".md,text/markdown,text/plain"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPrdFile(f);
                if (f) setPrdText("");
              }}
              disabled={submitting}
              style={{ fontSize: "0.72rem", color: "#888" }}
            />
            {prdFile && (
              <button
                type="button"
                onClick={() => setPrdFile(null)}
                disabled={submitting}
                style={{ background: "transparent", border: "none", color: "#4f9eff", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
              >
                remover ({prdFile.name})
              </button>
            )}
          </div>
          {!prdValid && (prdText.length > 0 || prdFile !== null) && (
            <div style={{ color: "#e46e6e", fontSize: "0.7rem", marginTop: "0.3rem" }}>
              PRD precisa ter ≥200 chars ou um arquivo .md selecionado.
            </div>
          )}
        </div>

        <div style={{ background: "#1a2230", padding: "0.6rem 0.8rem", borderRadius: 4, fontSize: "0.7rem", color: "#888", lineHeight: 1.7, marginBottom: "1rem" }}>
          Vai criar:
          <div>✓ bevox-knowledge folders + stubs</div>
          <div>✓ kanban-tasks: 1 active + 1 next sprint</div>
          <div>✓ ~/.openclaw/{id || "<id>"}/ runtime workspace</div>
          <div>✓ ~/code/{id || "<id>"}/ git init</div>
          <div>✓ GitHub: bernardTavares/{id || "<id>"} (private)</div>
        </div>

        {error && (
          <div style={{ background: "#3f1e1e", color: "#e46e6e", padding: "0.6rem 0.8rem", borderRadius: 4, fontSize: "0.78rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button type="button" onClick={onClose} disabled={submitting} style={{ background: "transparent", border: "1px solid #2a2f3e", color: "#888", padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: "0.85rem", cursor: "pointer" }}>Abortar</button>
          <button type="button" onClick={submit} disabled={!canSubmit} style={{ background: canSubmit ? "#1e3a5f" : "#2a2f3e", color: canSubmit ? "#6ec1e4" : "#666", border: "none", padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: "0.85rem", cursor: canSubmit ? "pointer" : "not-allowed" }}>
            {submitting
              ? submitStage === "persona"
                ? "Forjando persona Voz..."
                : "Criando projeto..."
              : "Criar projeto + agente"}
          </button>
        </div>
      </div>
    </div>
  );
}
