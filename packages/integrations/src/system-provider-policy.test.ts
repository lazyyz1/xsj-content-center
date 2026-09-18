import { afterEach, describe, expect, it } from "vitest";
import { getSystemProviderConfig, getSystemProviderPublicConfig, systemManagedProvidersEnabled } from "./system-provider-policy";

const names = ["NODE_ENV", "ENVIRONMENT_ID", "PLAYWRIGHT_SERVER_MODE", "SYSTEM_MANAGED_PROVIDERS", "AI_PROVIDER", "AI_MODEL_ID", "AI_BASE_URL", "KIMI_API_KEY", "KIMI_BASE_URL", "KIMI_MODEL_ID", "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL_ID", "REDFOX_API_KEY", "DOUBAO_API_KEY", "DOUBAO_APP_ID", "DOUBAO_ACCESS_TOKEN", "DOUBAO_ASR_RESOURCE_ID", "TRANSCRIPTION_PRIMARY"] as const;
const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    const value = original[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

describe("system-managed provider policy", () => {
  it("ignores workspace overrides in explicit system-managed mode", () => {
    process.env.SYSTEM_MANAGED_PROVIDERS = "true";
    process.env.KIMI_API_KEY = "secret-kimi";
    process.env.KIMI_MODEL_ID = "kimi-k2.6";
    expect(systemManagedProvidersEnabled()).toBe(true);
    expect(getSystemProviderConfig("LLM")).toMatchObject({ provider: "KIMI", apiKey: "secret-kimi", model: "kimi-k2.6", requestedModel: "kimi-k2.6" });
    expect(getSystemProviderPublicConfig("LLM")).not.toHaveProperty("apiKey");
  });

  it("supports an explicitly selected DeepSeek catalog model without exposing its key", () => {
    process.env.SYSTEM_MANAGED_PROVIDERS = "true";
    process.env.AI_PROVIDER = "DEEPSEEK";
    process.env.AI_MODEL_ID = "deepseek-v4-flash";
    process.env.DEEPSEEK_API_KEY = "secret-deepseek";
    expect(getSystemProviderConfig("LLM")).toMatchObject({ provider: "DEEPSEEK", model: "deepseek-v4-flash", requestedModel: "deepseek-v4-flash" });
    expect(getSystemProviderPublicConfig("LLM")).not.toHaveProperty("apiKey");
    process.env.AI_MODEL_ID = "deepseek-v5";
    expect(getSystemProviderConfig("LLM")).toBeNull();
  });

  it("requires an explicit Recording File 2.0 resource id", () => {
    process.env.SYSTEM_MANAGED_PROVIDERS = "true";
    process.env.DOUBAO_API_KEY = "secret-doubao";
    delete process.env.DOUBAO_ASR_RESOURCE_ID;
    expect(getSystemProviderConfig("DOUBAO_ASR")).toBeNull();
    process.env.DOUBAO_ASR_RESOURCE_ID = "volc.seedasr.auc";
    expect(getSystemProviderConfig("DOUBAO_ASR")).toMatchObject({ protocol: "RECORDING_FILE_2_0", resourceId: "volc.seedasr.auc" });
  });

  it("routes production transcription without user-selectable provider settings", () => {
    process.env.NODE_ENV = "production";
    process.env.SYSTEM_MANAGED_PROVIDERS = "false";
    delete process.env.TRANSCRIPTION_PRIMARY;
    expect(systemManagedProvidersEnabled()).toBe(true);
    expect(getSystemProviderConfig("TRANSCRIPTION")).toMatchObject({ source: "DOUBAO", fallbackToDoubao: false });
  });

  it("keeps LOCAL_TEST production-like runs on workspace integrations", () => {
    process.env.NODE_ENV = "production";
    process.env.ENVIRONMENT_ID = "LOCAL_TEST";
    process.env.PLAYWRIGHT_SERVER_MODE = "production";
    process.env.SYSTEM_MANAGED_PROVIDERS = "false";
    expect(systemManagedProvidersEnabled()).toBe(false);
  });
});
