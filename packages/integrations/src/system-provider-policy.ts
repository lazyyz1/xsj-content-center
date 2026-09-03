import type { ConfigurableIntegrationProvider } from "./schemas";
import { CURRENT_KIMI_PRODUCT_MODEL, KIMI_INTEGRATION_TYPE } from "./kimi-model-policy";

const value = (name: string) => process.env[name]?.trim() || undefined;

export function systemManagedProvidersEnabled() {
  if (process.env.NODE_ENV === "production") return true;
  return process.env.SYSTEM_MANAGED_PROVIDERS === "true";
}

export function getSystemProviderConfig(provider: ConfigurableIntegrationProvider): Record<string, unknown> | null {
  if (!systemManagedProvidersEnabled()) return null;
  if (provider === "LLM") {
    const apiKey = value("KIMI_API_KEY");
    const baseUrl = value("KIMI_BASE_URL") ?? "https://api.moonshot.ai/v1";
    const apiModelId = value("KIMI_MODEL_ID") ?? "kimi-k2.6";
    return apiKey ? {
      provider: KIMI_INTEGRATION_TYPE,
      integrationType: KIMI_INTEGRATION_TYPE,
      productModel: CURRENT_KIMI_PRODUCT_MODEL,
      baseUrl,
      apiKey,
      model: apiModelId,
      apiModelId,
      mode: "REAL",
    } : null;
  }
  if (provider === "REDFOX") {
    const apiKey = value("REDFOX_API_KEY");
    return apiKey ? { apiKey, baseUrl: value("REDFOX_BASE_URL") ?? "https://redfox.hk" } : null;
  }
  if (provider === "DOUBAO_ASR") {
    const apiKey = value("DOUBAO_API_KEY");
    const appId = value("DOUBAO_APP_ID");
    const accessToken = value("DOUBAO_ACCESS_TOKEN");
    const resourceId = value("DOUBAO_ASR_RESOURCE_ID");
    if (!resourceId || (!apiKey && !(appId && accessToken))) return null;
    return {
      authMode: apiKey ? "API_KEY" : "LEGACY_APP_TOKEN",
      baseUrl: value("DOUBAO_ASR_BASE_URL") ?? "https://openspeech.bytedance.com",
      resourceId,
      ...(apiKey ? { apiKey } : { appId, accessToken }),
      protocol: "RECORDING_FILE_2_0",
    };
  }
  const transcriptionPrimary = value("TRANSCRIPTION_PRIMARY")
    ?? (process.env.NODE_ENV === "production" ? "DOUBAO_RECORDING_FILE_2_0" : "LOCAL_FUNASR");
  return {
    source: transcriptionPrimary === "DOUBAO_RECORDING_FILE_2_0" ? "DOUBAO" : "LOCAL_FUNASR",
    qualityMode: "BALANCED",
    selectionMode: "AUTO",
    fallbackToDoubao: false,
    endpoint: value("LOCAL_ASR_ENDPOINT") ?? "http://127.0.0.1:8765",
  };
}

export function getSystemProviderPublicConfig(provider: ConfigurableIntegrationProvider) {
  const config = getSystemProviderConfig(provider);
  if (!config) return null;
  return Object.fromEntries(Object.entries(config).filter(([key]) => key !== "apiKey" && key !== "accessToken"));
}
