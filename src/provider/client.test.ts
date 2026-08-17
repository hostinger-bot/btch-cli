import type { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as settings from "../utils/settings";
import { createProvider, generateRecap, resolveModelRuntime } from "./client";

const mockGenerateText = vi.hoisted(() => vi.fn());

vi.mock("ai", () => {
  return {
    generateText: mockGenerateText,
  };
});

describe("client", () => {
  const mockProvider = createProvider("test-key", "https://example.com/v1");

  describe("createProvider", () => {
    it("creates an OpenAI-compatible provider with the given base URL", () => {
      expect(mockProvider).toBeTypeOf("function");
      expect(mockProvider("deepseek-v4-flash")).toHaveProperty("modelId", "deepseek-v4-flash");
    });
  });

  describe("generateRecap", () => {
    beforeEach(() => {
      mockGenerateText.mockReset();
    });

    it("generates a normalized recap with the recap prompt contract", async () => {
      const signal = new AbortController().signal;
      mockGenerateText.mockResolvedValue({
        text: ' "Wrapped up the parser fix. Next step is wiring the new recap banner." ',
        usage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
      } as Awaited<ReturnType<typeof generateText>>);

      const result = await generateRecap(mockProvider, "transcript body", signal);

      expect(result).toEqual({
        recap: "Wrapped up the parser fix. Next step is wiring the new recap banner.",
        modelId: "auto",
        usage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
      });
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: signal,
          maxOutputTokens: 120,
          prompt: "transcript body",
          system: expect.stringContaining("Maximum 3 sentences total"),
        }),
      );
    });

    it("returns an empty recap when generation fails", async () => {
      mockGenerateText.mockRejectedValue(new Error("boom"));

      const result = await generateRecap(mockProvider, "transcript body");

      expect(result).toEqual({
        recap: "",
        modelId: "auto",
      });
    });
  });

  describe("resolveModelRuntime", () => {
    it("resolves a known model id", () => {
      const runtime = resolveModelRuntime(mockProvider, "deepseek-v4-flash");
      expect(runtime.modelId).toBe("deepseek-v4-flash");
      expect(runtime.modelInfo?.name).toBe("DeepSeek V4 Flash");
      expect(runtime.providerOptions).toBeUndefined();
    });

    it("passes through unknown model ids without normalization", () => {
      const runtime = resolveModelRuntime(mockProvider, "some-remote-model");
      expect(runtime.modelId).toBe("some-remote-model");
      expect(runtime.modelInfo).toBeUndefined();
    });

    it("strips provider prefixes like openai/ from model ids", () => {
      const runtime = resolveModelRuntime(mockProvider, "openai/deepseek-v4-flash");
      expect(runtime.modelId).toBe("deepseek-v4-flash");
    });

    it("resolves case-insensitively to the canonical model id", () => {
      const runtime = resolveModelRuntime(mockProvider, "DEEPSEEK-V4-FLASH");
      expect(runtime.modelId).toBe("deepseek-v4-flash");
    });
  });

  describe("with configured reasoning effort", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("does not attach providerOptions for models that do not support reasoning effort", () => {
      vi.spyOn(settings, "getReasoningEffortForModel").mockReturnValue("high");
      const runtime = resolveModelRuntime(mockProvider, "deepseek-v4-flash");
      expect(runtime.modelId).toBe("deepseek-v4-flash");
      expect(runtime.providerOptions).toBeUndefined();
    });
  });
});
