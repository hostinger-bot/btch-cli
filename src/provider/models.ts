import type { ModelInfo, ReasoningEffort } from "../types/index";

/**
 * Fallback model list used when the endpoint cannot be reached (no key, offline).
 * The real list is fetched from the configured endpoint at CLI startup — see
 * `fetchModels` / `setRemoteModels`. Entries here also seed metadata (context
 * window, pricing) that the /models endpoint does not provide.
 */
export const MODELS: ModelInfo[] = [
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    contextWindow: 128_000,
    inputPrice: 0,
    outputPrice: 0,
    reasoning: false,
    description: "Fast general-purpose chat model",
  },
  {
    id: "DeepSeek-V4-Pro",
    name: "DeepSeek V4 Pro",
    contextWindow: 128_000,
    inputPrice: 0,
    outputPrice: 0,
    reasoning: true,
    description: "Strong reasoning chat model",
  },
  {
    id: "Qwen3.6-35B-A3B-FP8",
    name: "Qwen 3.6 35B A3B FP8",
    contextWindow: 128_000,
    inputPrice: 0,
    outputPrice: 0,
    reasoning: false,
    description: "Compact efficient model",
  },
  {
    id: "auto",
    name: "Auto",
    contextWindow: 128_000,
    inputPrice: 0,
    outputPrice: 0,
    reasoning: false,
    description: "Endpoint-managed automatic model routing",
  },
];

const PROVIDER_PREFIX_RE = /^(openai|anthropic|gemini)\//i;

// Alias map is built from the static list; remote ids are passed through as-is.
const aliasMap = new Map<string, string>();

for (const model of MODELS) {
  aliasMap.set(model.id.toLowerCase(), model.id);
  for (const alias of model.aliases ?? []) {
    aliasMap.set(alias.toLowerCase(), model.id);
  }
}

export const DEFAULT_MODEL =
  MODELS.find((model) => model.id === "deepseek-v4-flash")?.id ?? MODELS[0]?.id ?? "deepseek-v4-flash";

let remoteModels: ModelInfo[] = [];

/** Models reported by the configured endpoint, merged after the fallback list. */
export function getAllModels(): ModelInfo[] {
  if (remoteModels.length === 0) {
    return MODELS;
  }
  const ids = new Set(remoteModels.map((m) => m.id.toLowerCase()));
  return [...remoteModels, ...MODELS.filter((m) => !ids.has(m.id.toLowerCase()))];
}

export function setRemoteModels(models: ModelInfo[]): void {
  remoteModels = models;
}

export interface RemoteModelDescriptor {
  id: string;
}

/** Fetch the model list advertised by an OpenAI-compatible /models endpoint. */
export async function fetchModels(baseURL: string, apiKey?: string): Promise<ModelInfo[]> {
  const url = `${baseURL.replace(/\/+$/, "")}/models`;
  const response = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch models (${response.status})`);
  }
  const payload = (await response.json()) as { data?: RemoteModelDescriptor[] };
  const descriptors = Array.isArray(payload?.data) ? payload.data : [];
  return descriptors
    .filter((d) => typeof d?.id === "string" && d.id.trim() !== "")
    .map((d) => modelInfoFromRemoteId(d.id));
}

/** Best-effort refresh: fetch remote models and install them, swallowing errors. */
export async function refreshModels(baseURL: string, apiKey?: string): Promise<void> {
  try {
    const models = await fetchModels(baseURL, apiKey);
    if (models.length > 0) {
      setRemoteModels(models);
    }
  } catch {
    // Keep the fallback list when the endpoint is unreachable.
  }
}

function modelInfoFromRemoteId(id: string): ModelInfo {
  return {
    id,
    name: prettifyModelName(id),
    contextWindow: 128_000,
    inputPrice: 0,
    outputPrice: 0,
    reasoning: false,
    description: "Model served by the configured endpoint",
  };
}

function prettifyModelName(id: string): string {
  const base = id.includes("/") ? (id.split("/").pop() ?? id) : id;
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeModelId(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) return trimmed;

  const withoutProviderPrefix = trimmed.replace(PROVIDER_PREFIX_RE, "");
  return aliasMap.get(withoutProviderPrefix.toLowerCase()) ?? withoutProviderPrefix;
}

export function getModelInfo(modelId: string): ModelInfo | undefined {
  const normalized = normalizeModelId(modelId);
  return getAllModels().find((m) => m.id === normalized);
}

export function getModelIds(): string[] {
  return getAllModels().map((m) => m.id);
}

export function isKnownModelId(modelId: string): boolean {
  return !!getModelInfo(modelId);
}

export function getSupportedReasoningEfforts(modelId: string): ReasoningEffort[] {
  const modelInfo = getModelInfo(modelId);
  if (!modelInfo?.supportsReasoningEffort) return [];
  return ["low", "high"];
}

export function getEffectiveReasoningEffort(modelId: string, override?: ReasoningEffort): ReasoningEffort | undefined {
  const supported = getSupportedReasoningEfforts(modelId);
  if (supported.length === 0) return undefined;
  if (override && supported.includes(override)) return override;
  const defaultEffort = getModelInfo(modelId)?.defaultReasoningEffort;
  return defaultEffort && supported.includes(defaultEffort) ? defaultEffort : undefined;
}
