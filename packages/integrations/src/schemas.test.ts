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

  it("defaults Doubao to the current API key protocol", () => {
    expect(parseProviderConfig("DOUBAO_ASR", {})).toEqual({
      authMode: "API_KEY",
      baseUrl: "https://openspeech.bytedance.com",
      resourceId: "volc.bigasr.auc_turbo",
    });
    const parsed = parseProviderConfig("DOUBAO_ASR", {
      authMode: "API_KEY",
      apiKey: "fake-api-key",
      boostingTableId: "table-id",
    });
    const split = splitProviderConfig("DOUBAO_ASR", parsed);
    expect(split.publicConfig).toMatchObject({ authMode: "API_KEY", resourceId: "volc.bigasr.auc_turbo", boostingTableId: "table-id" });
    expect(split.secretConfig).toEqual({ apiKey: "fake-api-key" });
  });

  it("keeps the documented legacy Doubao authentication mode", () => {
    const parsed = parseProviderConfig("DOUBAO_ASR", { appId: "legacy-app", accessToken: "legacy-token" });
    expect(parsed).toMatchObject({ authMode: "LEGACY_APP_TOKEN", appId: "legacy-app" });
    expect(splitProviderConfig("DOUBAO_ASR", parsed).secretConfig).toEqual({ accessToken: "legacy-token" });
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
