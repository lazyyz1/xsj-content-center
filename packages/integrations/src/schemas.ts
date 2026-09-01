import { z } from "zod";

export const CONFIGURABLE_INTEGRATION_PROVIDERS = ["REDFOX", "DOUBAO_ASR", "LLM"] as const;
export type ConfigurableIntegrationProvider = (typeof CONFIGURABLE_INTEGRATION_PROVIDERS)[number];

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).max(max).optional(),
  );

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url().max(2_000).optional(),
);

export const DOUBAO_DEFAULT_BASE_URL = "https://openspeech.bytedance.com";
export const DOUBAO_DEFAULT_RESOURCE_ID = "volc.bigasr.auc_turbo";
export const DOUBAO_AUTH_MODES = ["API_KEY", "LEGACY_APP_TOKEN"] as const;

const optionalAuthMode = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.enum(DOUBAO_AUTH_MODES).optional(),
);

export const redfoxConfigSchema = z
  .object({
    baseUrl: z.string().trim().url().max(2_000),
    apiKey: optionalText(10_000),
  })
  .strict();

export const doubaoAsrConfigSchema = z
  .object({
    authMode: optionalAuthMode,
    baseUrl: optionalUrl,
    apiKey: optionalText(10_000),
    appId: optionalText(500),
    accessToken: optionalText(10_000),
    resourceId: optionalText(500),
    boostingTableId: optionalText(500),
    boostingTableName: optionalText(500),
  })
  .strict()
  .transform((config) => ({
    ...config,
    authMode: config.authMode ?? (config.appId || config.accessToken ? "LEGACY_APP_TOKEN" as const : "API_KEY" as const),
    baseUrl: config.baseUrl ?? DOUBAO_DEFAULT_BASE_URL,
    resourceId: config.resourceId ?? DOUBAO_DEFAULT_RESOURCE_ID,
  }));

export const llmConfigSchema = z
  .object({
    provider: z.string().trim().min(1).max(100),
    baseUrl: z.string().trim().url().max(2_000),
    apiKey: optionalText(10_000),
    model: z.string().trim().min(1).max(200),
  })
  .strict();

export const providerConfigSchemas = {
  REDFOX: redfoxConfigSchema,
  DOUBAO_ASR: doubaoAsrConfigSchema,
  LLM: llmConfigSchema,
} as const;

export const providerConfigFields: Record<
  ConfigurableIntegrationProvider,
  { publicFields: readonly string[]; secretFields: readonly string[]; primarySecret: string }
> = {
  REDFOX: { publicFields: ["baseUrl"], secretFields: ["apiKey"], primarySecret: "apiKey" },
  DOUBAO_ASR: {
    publicFields: ["authMode", "baseUrl", "appId", "resourceId", "boostingTableId", "boostingTableName"],
    secretFields: ["apiKey", "accessToken"],
    primarySecret: "apiKey",
  },
  LLM: { publicFields: ["provider", "baseUrl", "model"], secretFields: ["apiKey"], primarySecret: "apiKey" },
};

export function normalizePublicProviderConfig(
  provider: ConfigurableIntegrationProvider,
  config: Record<string, unknown>,
) {
  if (provider !== "DOUBAO_ASR") return config;
  const authMode = config.authMode === "LEGACY_APP_TOKEN" || (!config.authMode && config.appId)
    ? "LEGACY_APP_TOKEN"
    : "API_KEY";
  return {
    ...config,
    authMode,
    baseUrl: typeof config.baseUrl === "string" ? config.baseUrl : DOUBAO_DEFAULT_BASE_URL,
    resourceId: typeof config.resourceId === "string" ? config.resourceId : DOUBAO_DEFAULT_RESOURCE_ID,
  };
}

export function primarySecretField(
  provider: ConfigurableIntegrationProvider,
  config: Record<string, unknown>,
) {
  if (provider === "DOUBAO_ASR") {
    return config.authMode === "LEGACY_APP_TOKEN" ? "accessToken" : "apiKey";
  }
  return providerConfigFields[provider].primarySecret;
}

export function isConfigurableIntegrationProvider(value: string): value is ConfigurableIntegrationProvider {
  return CONFIGURABLE_INTEGRATION_PROVIDERS.includes(value as ConfigurableIntegrationProvider);
}

export function parseProviderConfig(provider: ConfigurableIntegrationProvider, input: unknown) {
  return providerConfigSchemas[provider].parse(input) as Record<string, unknown>;
}

export function splitProviderConfig(provider: ConfigurableIntegrationProvider, config: Record<string, unknown>) {
  const fields = providerConfigFields[provider];
  const publicConfig = Object.fromEntries(fields.publicFields.filter((field) => config[field] !== undefined).map((field) => [field, config[field]]));
  const secretConfig = Object.fromEntries(fields.secretFields.filter((field) => config[field] !== undefined).map((field) => [field, config[field]]));
  return { publicConfig, secretConfig };
}
