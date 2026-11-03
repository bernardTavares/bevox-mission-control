/**
 * OpenClaw Model Pricing
 * Based on OpenRouter and Anthropic pricing as of Feb 2026
 * All prices in USD per million tokens
 */

export interface ModelPricing {
  id: string;
  name: string;
  alias?: string;
  inputPricePerMillion: number;
  cachedInputPricePerMillion?: number;
  outputPricePerMillion: number;
  contextWindow: number;
}

export const MODEL_PRICING: ModelPricing[] = [
  // Anthropic models
  {
    id: "anthropic/claude-opus-4-6",
    name: "Opus 4.6",
    alias: "opus",
    inputPricePerMillion: 15.00,
    outputPricePerMillion: 75.00,
    contextWindow: 200000,
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Sonnet 4.5",
    alias: "sonnet",
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
    contextWindow: 200000,
  },
  {
    id: "anthropic/claude-haiku-3-5",
    name: "Haiku 3.5",
    alias: "haiku",
    inputPricePerMillion: 0.80,
    outputPricePerMillion: 4.00,
    contextWindow: 200000,
  },
  // Google Gemini models
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini Flash",
    alias: "gemini-flash",
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
    contextWindow: 1000000,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini Pro",
    alias: "gemini-pro",
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.00,
    contextWindow: 2000000,
  },
  // X.AI Grok
  {
    id: "x-ai/grok-4-1-fast",
    name: "Grok 4.1 Fast",
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 10.00,
    contextWindow: 128000,
  },
  // MiniMax
  {
    id: "minimax/minimax-m2.5",
    name: "MiniMax M2.5",
    alias: "minimax",
    inputPricePerMillion: 0.30,
    outputPricePerMillion: 1.10,
    contextWindow: 1000000,
  },
  // OpenAI / GPT-5.4 — gateway OpenClaw (agent main/Vox)
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    alias: "gpt-5.4",
    inputPricePerMillion: 2.50,
    cachedInputPricePerMillion: 0.25,
    outputPricePerMillion: 15.00,
    contextWindow: 272000,
  },
];

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0,
): number {
  const pricing = MODEL_PRICING.find(
    (p) => p.id === modelId || p.alias === modelId
  );

  if (!pricing) {
    console.warn(
      `[pricing] unknown model "${modelId}" — returning 0 to avoid false-positive cost`,
    );
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
  const cachedCost =
    pricing.cachedInputPricePerMillion !== undefined
      ? (cachedInputTokens / 1_000_000) * pricing.cachedInputPricePerMillion
      : 0;

  return inputCost + outputCost + cachedCost;
}

/**
 * Get human-readable model name
 */
export function getModelName(modelId: string): string {
  const pricing = MODEL_PRICING.find(
    (p) => p.id === modelId || p.alias === modelId
  );
  return pricing?.name || modelId;
}

/**
 * Normalize model ID (handle aliases and different formats)
 */
export function normalizeModelId(modelId: string): string {
  // Handle short aliases and OpenClaw format (without provider prefix)
  const aliasMap: Record<string, string> = {
    // Short aliases
    opus: "anthropic/claude-opus-4-6",
    sonnet: "anthropic/claude-sonnet-4-5",
    haiku: "anthropic/claude-haiku-3-5",
    "gemini-flash": "google/gemini-2.5-flash",
    "gemini-pro": "google/gemini-2.5-pro",
    // OpenClaw format (without provider/)
    "claude-opus-4-6": "anthropic/claude-opus-4-6",
    "claude-sonnet-4-5": "anthropic/claude-sonnet-4-5",
    "claude-haiku-3-5": "anthropic/claude-haiku-3-5",
    "gemini-2.5-flash": "google/gemini-2.5-flash",
    "gemini-2.5-pro": "google/gemini-2.5-pro",
    // MiniMax
    minimax: "minimax/minimax-m2.5",
    "minimax-m2.5": "minimax/minimax-m2.5",
    // OpenAI / GPT-5.4 (OpenClaw gateway format, no provider prefix)
    "gpt-5.4": "openai/gpt-5.4",
  };

  return aliasMap[modelId] || modelId;
}
