import { describe, expect, it } from "vitest";
import { parseProviderConfig, splitProviderConfig } from "./schemas";

describe("provider config schemas", () => {
  it("validates RedFox public and secret fields without guessing an endpoint", () => {
    expect(parseProviderConfig("REDFOX", { baseUrl: "https://example.invalid", apiKey: "fake-key" })).toEqual({
      baseUrl: "https://example.invalid",
      apiKey: "fake-key",
    });
    expect(() => parseProviderConfig("REDFOX", { baseUrl: "not-a-url", apiKey: "fake-key" })).toThrow();
    expect(() => parseProviderConfig("REDFOX", { baseUrl: "https://example.invalid", unknown: true })).toThrow();
  });

  it("keeps undocumented Doubao fields optional", () => {
    expect(parseProviderConfig("DOUBAO_ASR", {})).toEqual({});
    expect(parseProviderConfig("DOUBAO_ASR", { baseUrl: "", appId: "", accessToken: "" })).toEqual({});
    const split = splitProviderConfig("DOUBAO_ASR", { baseUrl: "https://example.invalid", extra: { futureSecret: "hidden" } });
    expect(split.publicConfig).toEqual({ baseUrl: "https://example.invalid" });
    expect(split.secretConfig).toEqual({ extra: { futureSecret: "hidden" } });
  });

  it("validates the reserved LLM configuration without invoking it", () => {
    expect(parseProviderConfig("LLM", {
      provider: "openai-compatible",
      baseUrl: "https://example.invalid/v1",
      apiKey: "fake-key",
      model: "example-model",
    })).toMatchObject({ provider: "openai-compatible", model: "example-model" });
  });
});
