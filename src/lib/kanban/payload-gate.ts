// payload-gate.ts — TS mirror do Python lib/payload_gate.py.
//
// Espelho de validacao para uso em MC route.ts (pre-validate client-side
// antes de chamar CLI). Python gate permanece como defesa final. Mantem
// mesma semantica: spec_ref nao-vazio (string OU lista), acceptance_criteria
// lista nao-vazia. Error code consistente com Python.

export const PAYLOAD_GATE_ERROR_CODE = "PAYLOAD_INCOMPLETE" as const;

export type Payload = {
  spec_ref?: unknown;
  acceptance_criteria?: unknown;
  [key: string]: unknown;
};

export function validatePayload(payload: Payload | null | undefined): string[] {
  const missing: string[] = [];
  if (!payload || typeof payload !== "object") {
    return ["spec_ref", "acceptance_criteria"];
  }

  const spec = payload.spec_ref;
  let specOk = false;
  if (typeof spec === "string") {
    specOk = spec.trim().length > 0;
  } else if (Array.isArray(spec)) {
    specOk = spec.length > 0;
  }
  if (!specOk) missing.push("spec_ref");

  const ac = payload.acceptance_criteria;
  const acOk = Array.isArray(ac) && ac.length > 0;
  if (!acOk) missing.push("acceptance_criteria");

  return missing;
}
