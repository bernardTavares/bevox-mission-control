import type { DepsMap } from "@/lib/roadmap/types";

/**
 * Parse epic dependencies from the roadmap narrative markdown.
 *
 * Finds each `### E<N>[.<M>] - ...` heading and, within its section,
 * extracts the `**Dependencias:** E1, E2, ...` line. Tolerates
 * checkmarks and free-form text after each epic id; keeps only
 * tokens matching ^E[0-9]+(\.[0-9]+)?$.
 *
 * Returns `{}` for malformed or empty input (graceful degradation).
 */
export function parseDeps(markdown: string): DepsMap {
  const result: DepsMap = {};
  const parts = markdown.split(/^### (E\d+(?:\.\d+)?) - /m);
  for (let i = 1; i < parts.length; i += 2) {
    const epicId = parts[i].trim();
    const body = parts[i + 1] ?? "";
    const match = body.match(/\*\*Dependencias:\*\* (.+?)$/m);
    if (!match) {
      result[epicId] = [];
      continue;
    }
    const deps = match[1]
      .split(/,\s*/)
      .map((s) => s.trim())
      .map((s) => s.match(/^E\d+(?:\.\d+)?/)?.[0])
      .filter((s): s is string => !!s);
    result[epicId] = deps;
  }
  return result;
}
