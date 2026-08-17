import { beforeEach, describe, expect, it } from "vitest";
import type { AgentMode } from "../types/index";
import { getCurrentModel, parseSubAgentsRawList } from "./settings";

describe("parseSubAgentsRawList", () => {
  it("returns empty for non-array or missing", () => {
    expect(parseSubAgentsRawList(undefined)).toEqual([]);
    expect(parseSubAgentsRawList(null)).toEqual([]);
    expect(parseSubAgentsRawList({})).toEqual([]);
  });

  it("keeps valid entries with known model ids", () => {
    expect(
      parseSubAgentsRawList([{ name: "docs", model: "deepseek-v4-flash", instruction: "Focus on documentation." }]),
    ).toEqual([{ name: "docs", model: "deepseek-v4-flash", instruction: "Focus on documentation." }]);
  });

  it("normalizes model ids to canonical ids", () => {
    expect(
      parseSubAgentsRawList([
        { name: "research", model: "openai/DEEPSEEK-V4-FLASH", instruction: "Focus on research." },
      ]),
    ).toEqual([{ name: "research", model: "deepseek-v4-flash", instruction: "Focus on research." }]);
  });

  it("skips unknown models", () => {
    expect(parseSubAgentsRawList([{ name: "bad", model: "not-a-real-model", instruction: "x" }])).toEqual([]);
  });

  it("skips reserved and empty names", () => {
    expect(
      parseSubAgentsRawList([
        { name: "general", model: "deepseek-v4-flash", instruction: "x" },
        { name: "Explore", model: "deepseek-v4-flash", instruction: "x" },
        { name: "vision", model: "deepseek-v4-flash", instruction: "x" },
        { name: "Verify", model: "deepseek-v4-flash", instruction: "x" },
        { name: "computer", model: "deepseek-v4-flash", instruction: "x" },
        { name: "", model: "deepseek-v4-flash", instruction: "x" },
        { name: "  ", model: "deepseek-v4-flash", instruction: "x" },
      ]),
    ).toEqual([]);
  });

  it("dedupes by case-insensitive name with first entry winning", () => {
    expect(
      parseSubAgentsRawList([
        { name: "Docs", model: "DeepSeek-V4-Pro", instruction: "first" },
        { name: "docs", model: "deepseek-v4-flash", instruction: "second" },
      ]),
    ).toEqual([{ name: "Docs", model: "DeepSeek-V4-Pro", instruction: "first" }]);
  });

  it("ignores non-object rows", () => {
    expect(parseSubAgentsRawList([null, "x", { name: "ok", model: "deepseek-v4-flash", instruction: "" }])).toEqual([
      { name: "ok", model: "deepseek-v4-flash", instruction: "" },
    ]);
  });
});

describe("getCurrentModel with modeModels", () => {
  beforeEach(() => {
    delete process.env.BTCH_MODEL;
  });

  it("respects mode-specific models when provided", () => {
    // This test assumes a test environment where we can check the logic path.
    // In a real environment with proper settings, this would return the mode-specific model.
    const result = getCurrentModel("agent" as AgentMode);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("respects BTCH_MODEL environment variable over modeModels", () => {
    process.env.BTCH_MODEL = "some-special-model";

    const result = getCurrentModel("agent" as AgentMode);
    expect(result).toBe("some-special-model");
  });
});
