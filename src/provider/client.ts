import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import type { ModelInfo, ReasoningEffort } from "../types/index";
import { getReasoningEffortForModel } from "../utils/settings";
import { getEffectiveReasoningEffort, getModelInfo, normalizeModelId } from "./models";

export type Provider = ReturnType<typeof createOpenAICompatible>;
export type ChatModel = ReturnType<Provider>;
export type RuntimeModel = ChatModel;

export const PROVIDER_NAME = "btch";
export const DEFAULT_BASE_URL = "https://ai.tioo.eu.org/v1";

const DEFAULT_TITLE_MODEL = "deepseek-v4-flash";
const DEFAULT_RECAP_MODEL = "deepseek-v4-flash";

interface GeneratedTextResult {
  modelId: string;
  usage?: {
    totalTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface GeneratedTitle extends GeneratedTextResult {
  title: string;
}

export interface GeneratedRecap extends GeneratedTextResult {
  recap: string;
}

export interface ResolvedModelRuntime {
  model: RuntimeModel;
  modelId: string;
  modelInfo?: ModelInfo;
  providerOptions?: {
    [PROVIDER_NAME]: {
      reasoningEffort?: ReasoningEffort;
    };
  };
}

export function createProvider(apiKey: string, baseURL?: string): Provider {
  return createOpenAICompatible({
    name: PROVIDER_NAME,
    apiKey,
    baseURL: baseURL || process.env.BTCH_BASE_URL || DEFAULT_BASE_URL,
  });
}

export function resolveModelRuntime(provider: Provider, requestedModelId: string): ResolvedModelRuntime {
  const modelId = normalizeModelId(requestedModelId);
  const modelInfo = getModelInfo(modelId);
  const reasoningEffort = getEffectiveReasoningEffort(modelId, getReasoningEffortForModel(modelId));

  return {
    model: provider(modelId),
    modelId,
    modelInfo,
    providerOptions: reasoningEffort
      ? {
          [PROVIDER_NAME]: {
            reasoningEffort,
          },
        }
      : undefined,
  };
}

export async function generateTitle(provider: Provider, userMessage: string): Promise<GeneratedTitle> {
  const runtime = resolveModelRuntime(provider, DEFAULT_TITLE_MODEL);
  try {
    const { text, usage } = await generateText({
      model: runtime.model,
      temperature: 0.5,
      ...(runtime.modelInfo?.supportsMaxOutputTokens === false ? {} : { maxOutputTokens: 60 }),
      ...(runtime.providerOptions ? { providerOptions: runtime.providerOptions } : {}),
      system: [
        "You are a title generator. Output ONLY a short title. Nothing else.",
        "Rules:",
        "- Single line, ≤50 characters",
        "- Use the same language as the user message",
        "- Focus on the main topic or intent",
        "- Keep technical terms, filenames, numbers exact",
        "- Remove filler words (the, this, my, a, an)",
        "- Never use tools or explain anything",
        "- If the message is a greeting, output something like 'Quick chat'",
      ].join("\n"),
      prompt: userMessage,
    });
    return {
      title: text?.trim().replace(/^["']|["']$/g, "") || "New session",
      modelId: runtime.modelId,
      usage,
    };
  } catch {
    return { title: "New session", modelId: runtime.modelId };
  }
}

export async function generateRecap(
  provider: Provider,
  transcript: string,
  signal?: AbortSignal,
): Promise<GeneratedRecap> {
  const runtime = resolveModelRuntime(provider, DEFAULT_RECAP_MODEL);
  try {
    const { text, usage } = await generateText({
      model: runtime.model,
      abortSignal: signal,
      temperature: 0.3,
      ...(runtime.modelInfo?.supportsMaxOutputTokens === false ? {} : { maxOutputTokens: 120 }),
      ...(runtime.providerOptions ? { providerOptions: runtime.providerOptions } : {}),
      system: [
        "You write terse coding-session recaps.",
        "Output ONLY the recap text. No bullets, headings, labels, or preamble.",
        "Rules:",
        "- Maximum 3 sentences total",
        "- Focus on what changed, what remains, and the most useful next step",
        "- Preserve exact file paths, function names, errors, and technical terms when present",
        "- Avoid filler, hedging, and repetition",
        "- Never mention being an AI, assistant, or summarizer",
      ].join("\n"),
      prompt: transcript,
    });
    return {
      recap: normalizeRecap(text),
      modelId: runtime.modelId,
      usage,
    };
  } catch {
    return { recap: "", modelId: runtime.modelId };
  }
}

function normalizeRecap(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ");
}
