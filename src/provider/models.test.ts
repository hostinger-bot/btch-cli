import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MODEL,
  fetchModels,
  getAllModels,
  getEffectiveReasoningEffort,
  getModelInfo,
  getSupportedReasoningEfforts,
  normalizeModelId,
  setRemoteModels,
} from "./models";

describe("models", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setRemoteModels([]);
  });

  it("keeps a canonical fallback default model", () => {
    expect(DEFAULT_MODEL).toBe("deepseek-v4-flash");
  });

  it("normalizes model ids case-insensitively and strips provider prefixes", () => {
    expect(normalizeModelId("deepseek-v4-flash")).toBe("deepseek-v4-flash");
    expect(normalizeModelId("DEEPSEEK-V4-FLASH")).toBe("deepseek-v4-flash");
    expect(normalizeModelId("openai/deepseek-v4-flash")).toBe("deepseek-v4-flash");
    expect(normalizeModelId("  DeepSeek-V4-Pro  ")).toBe("DeepSeek-V4-Pro");
  });

  it("passes unknown ids through unchanged", () => {
    expect(normalizeModelId("some-remote-model")).toBe("some-remote-model");
  });

  it("returns metadata for fallback models", () => {
    expect(getModelInfo("deepseek-v4-flash")?.name).toBe("DeepSeek V4 Flash");
    expect(getModelInfo("DeepSeek-V4-Pro")?.reasoning).toBe(true);
  });

  it("reports no reasoning-effort levels for fallback models", () => {
    expect(getSupportedReasoningEfforts("deepseek-v4-flash")).toEqual([]);
    expect(getSupportedReasoningEfforts("DeepSeek-V4-Pro")).toEqual([]);
  });

  it("resolves effective reasoning effort only for models that support it", () => {
    expect(getEffectiveReasoningEffort("deepseek-v4-flash")).toBeUndefined();
    expect(getEffectiveReasoningEffort("deepseek-v4-flash", "high")).toBeUndefined();
  });

  it("merges remote models ahead of the fallback list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({ data: [{ id: "remote-model-a" }, { id: "remote-model-b" }] }),
        };
      }),
    );

    const models = await fetchModels("https://example.com/v1", "key");
    expect(models.map((m) => m.id)).toEqual(["remote-model-a", "remote-model-b"]);
    setRemoteModels(models);

    const ids = getAllModels().map((m) => m.id);
    expect(ids).toContain("remote-model-a");
    expect(ids).toContain("deepseek-v4-flash");
  });

  it("throws when the models endpoint returns a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return { ok: false, status: 401 };
      }),
    );

    await expect(fetchModels("https://example.com/v1", "bad-key")).rejects.toThrow("Failed to fetch models (401)");
  });
});
