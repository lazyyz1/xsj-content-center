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

export const redfoxConfigSchema = z
  .object({
    baseUrl: z.string().trim().url().max(2_000),
    apiKey: optionalText(10_000),
  })
  .strict();

export const doubaoAsrConfigSchema = z
  .object({
    baseUrl: optionalUrl,
    appId: optionalText(500),
    accessToken: optionalText(10_000),
    resourceId: optionalText(500),
    cluster: optionalText(500),
    extra: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

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
    publicFields: ["baseUrl", "appId", "resourceId", "cluster"],
    secretFields: ["accessToken", "extra"],
    primarySecret: "accessToken",
  },
  LLM: { publicFields: ["provider", "baseUrl", "model"], secretFields: ["apiKey"], primarySecret: "apiKey" },
};

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
