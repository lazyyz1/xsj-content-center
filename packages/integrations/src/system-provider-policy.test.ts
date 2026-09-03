import { afterEach, describe, expect, it } from "vitest";
import { getSystemProviderConfig, getSystemProviderPublicConfig, systemManagedProvidersEnabled } from "./system-provider-policy";

const names = ["NODE_ENV", "SYSTEM_MANAGED_PROVIDERS", "KIMI_API_KEY", "KIMI_BASE_URL", "KIMI_MODEL_ID", "REDFOX_API_KEY", "DOUBAO_API_KEY", "DOUBAO_APP_ID", "DOUBAO_ACCESS_TOKEN", "DOUBAO_ASR_RESOURCE_ID", "TRANSCRIPTION_PRIMARY"] as const;
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
    expect(getSystemProviderConfig("LLM")).toMatchObject({ apiKey: "secret-kimi", model: "kimi-k2.6", productModel: "KIMI_2_6" });
    expect(getSystemProviderPublicConfig("LLM")).not.toHaveProperty("apiKey");
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
});
