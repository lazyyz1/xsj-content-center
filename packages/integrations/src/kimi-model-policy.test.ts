import { describe, expect, it } from "vitest";
import { classifyLLMConfig, CURRENT_KIMI_PRODUCT_MODEL, kimiRuntimeConfig, KIMI_PRODUCT_MODEL_ALLOWLIST } from "./kimi-model-policy";

describe("KimiModelPolicy", () => {
  it("has a single frozen product model", () => {
    expect(CURRENT_KIMI_PRODUCT_MODEL).toBe("KIMI_2_6");
    expect(KIMI_PRODUCT_MODEL_ALLOWLIST).toEqual(["KIMI_2_6"]);
  });

  it("requires an admin-provided API model ID before becoming current", () => {
    expect(classifyLLMConfig({ integrationType: "KIMI", productModel: "KIMI_2_6", baseUrl: "https://example.invalid/v1" })).toBe("UNCONFIGURED");
    expect(classifyLLMConfig({ integrationType: "KIMI", productModel: "KIMI_2_6", baseUrl: "https://example.invalid/v1", apiModelId: "console-confirmed-id" })).toBe("CURRENT");
  });

  it("never silently upgrades legacy or alternate product configs", () => {
    expect(classifyLLMConfig({ provider: "kimi", label: "legacy-alternate", modelId: "legacy-id" })).toBe("NEEDS_RECONFIGURATION");
    expect(classifyLLMConfig({ provider: "compatible", label: "legacy-custom", modelId: "legacy-id" })).toBe("NEEDS_RECONFIGURATION");
  });

  it("keeps K3 reserved and out of the normal analysis runtime", () => {
    const k3Config = { integrationType: "KIMI", productModel: "KIMI_K3", apiModelId: "kimi-k3" };
    expect(classifyLLMConfig(k3Config)).toBe("NEEDS_RECONFIGURATION");
    expect(kimiRuntimeConfig(k3Config, { apiKey: "test-secret" })).toBeNull();
  });
});
