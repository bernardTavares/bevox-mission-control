/**
 * Icon mapping para os 8 projetos canônicos (ADR-002).
 * Projetos desconhecidos caem em "📦" (genérico). Sprint sem project = "🎯" (mixed).
 * Mapeamento editável sem risk — puramente cosmético.
 */
export const PROJECT_ICONS: Record<string, string> = {
  "bevox-console": "🖥️",
  "bevox-harness": "🤖",
  "bevox-mobile": "📱",
  "bevox-web": "🌐",
  openclaw: "🐧",
  "mission-control": "🎛️",
  "bevox-knowledge": "📚",
  vox: "🗣️",
};

export function iconFor(project: string | null | undefined): string {
  if (!project) return "🎯";
  return PROJECT_ICONS[project] ?? "📦";
}
