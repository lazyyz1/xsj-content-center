export const CURRENT_KIMI_PRODUCT_MODEL = "KIMI_2_6" as const;
export const KIMI_PRODUCT_MODEL_ALLOWLIST = [CURRENT_KIMI_PRODUCT_MODEL] as const;
export const KIMI_INTEGRATION_TYPE = "KIMI" as const;

export type KimiPolicyState = "CURRENT" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "FIXTURE";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function classifyLLMConfig(config: Record<string, unknown>): KimiPolicyState {
  if (config.integrationType === "FIXTURE" && config.productModel === "FIXTURE") return "FIXTURE";
  if (Object.keys(config).length === 0) return "UNCONFIGURED";
  if (config.integrationType !== KIMI_INTEGRATION_TYPE || config.productModel !== CURRENT_KIMI_PRODUCT_MODEL) {
    return "NEEDS_RECONFIGURATION";
  }
  return text(config.apiModelId) ? "CURRENT" : "UNCONFIGURED";
}

export function isKimi26Config(config: Record<string, unknown>) {
  return classifyLLMConfig(config) === "CURRENT";
}

export function isFixtureLLMConfig(config: Record<string, unknown>) {
  return classifyLLMConfig(config) === "FIXTURE";
}

export function kimiRuntimeConfig(
  publicConfig: Record<string, unknown>,
  secretConfig: Record<string, unknown>,
) {
  const state = classifyLLMConfig(publicConfig);
  if (state === "CURRENT") {
    return {
      provider: KIMI_INTEGRATION_TYPE,
      baseUrl: publicConfig.baseUrl,
      apiKey: secretConfig.apiKey,
      model: publicConfig.apiModelId,
      integrationType: KIMI_INTEGRATION_TYPE,
      productModel: CURRENT_KIMI_PRODUCT_MODEL,
      apiModelId: publicConfig.apiModelId,
      mode: "REAL",
    };
  }
  if (state === "FIXTURE") {
    return {
      provider: publicConfig.provider,
      baseUrl: publicConfig.baseUrl,
      apiKey: secretConfig.apiKey,
      model: publicConfig.apiModelId,
      integrationType: "FIXTURE",
      productModel: "FIXTURE",
      apiModelId: publicConfig.apiModelId,
      mode: "FIXTURE",
    };
  }
  return null;
}
