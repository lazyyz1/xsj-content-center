import "server-only";

import {
  CONFIGURABLE_INTEGRATION_PROVIDERS,
  IntegrationService,
  type ConfigurableIntegrationProvider,
} from "@content-center/integrations";

export type IntegrationDisplayStatus = "CONFIGURED" | "UNCONFIGURED" | "ERROR" | "DISABLED" | "MOCK";

export type IntegrationDisplay = {
  provider: ConfigurableIntegrationProvider | "STORAGE";
  name: string;
  status: IntegrationDisplayStatus;
  configured: boolean;
  publicConfig: Record<string, unknown>;
  lastFour: string | null;
  updatedAt: string | null;
  description: string;
  managedBy: "WORKSPACE" | "ENVIRONMENT";
  connectionTest: "UNSUPPORTED_UNTIL_PROVIDER_STAGE" | "NOT_APPLICABLE";
};

const service = new IntegrationService();

const providerDetails: Record<ConfigurableIntegrationProvider, { name: string; description: string }> = {
  REDFOX: { name: "红狐 API", description: "Workspace 级内容来源凭证；Provider 尚未接入。" },
  DOUBAO_ASR: { name: "豆包 ASR", description: "Workspace 级语音转写凭证；Provider 尚未接入。" },
  LLM: { name: "LLM", description: "Workspace 级模型凭证；Provider 尚未接入。" },
};

function hasEvery(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export async function getIntegrationStatuses(workspaceId: string): Promise<IntegrationDisplay[]> {
  const workspaceIntegrations = await Promise.all(
    CONFIGURABLE_INTEGRATION_PROVIDERS.map(async (provider) => {
      const current = await service.getIntegrationStatus(workspaceId, provider);
      return {
        ...current,
        updatedAt: current.updatedAt?.toISOString() ?? null,
        ...providerDetails[provider],
        managedBy: "WORKSPACE" as const,
        connectionTest: "UNSUPPORTED_UNTIL_PROVIDER_STAGE" as const,
      };
    }),
  );
  const storageConfigured = hasEvery(
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  );
  return [
    ...workspaceIntegrations,
    {
      provider: "STORAGE",
      name: "Storage",
      status: storageConfigured ? "CONFIGURED" : "UNCONFIGURED",
      configured: storageConfigured,
      publicConfig: {},
      lastFour: null,
      updatedAt: null,
      description: "S3-compatible 对象存储，由服务端环境变量管理。",
      managedBy: "ENVIRONMENT",
      connectionTest: "NOT_APPLICABLE",
    },
  ];
}

export async function getIntegrationDisplay(workspaceId: string, provider: string) {
  return (await getIntegrationStatuses(workspaceId)).find((item) => item.provider === provider) ?? null;
}

export function integrationVisibleToRole(integration: IntegrationDisplay, canManage: boolean): IntegrationDisplay {
  return canManage ? integration : { ...integration, publicConfig: {}, lastFour: null };
}

export { service as integrationService };
