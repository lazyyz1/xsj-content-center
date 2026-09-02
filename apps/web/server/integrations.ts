import "server-only";

import {
  CONFIGURABLE_INTEGRATION_PROVIDERS,
  DOUBAO_DEFAULT_BASE_URL,
  DOUBAO_DEFAULT_RESOURCE_ID,
  IntegrationService,
  type ConfigurableIntegrationProvider,
} from "@content-center/integrations";
import { REDFOX_DEFAULT_BASE_URL } from "@content-center/providers";

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
  usage: readonly string[];
  defaults: Record<string, string>;
  managedBy: "WORKSPACE" | "ENVIRONMENT";
  connectionTest: "UNSUPPORTED_UNTIL_PROVIDER_STAGE" | "LIVE_API_TEST_NOT_AVAILABLE" | "NOT_APPLICABLE";
};

const service = new IntegrationService();

const providerDetails: Record<ConfigurableIntegrationProvider, { name: string; description: string; usage: readonly string[]; defaults: Record<string, string> }> = {
  REDFOX: {
    name: "RedFox",
    description: "解析抖音等平台素材，获取视频和内容信息。",
    usage: ["抖音素材收录"],
    defaults: { baseUrl: REDFOX_DEFAULT_BASE_URL },
  },
  DOUBAO_ASR: {
    name: "豆包语音识别",
    description: "将视频中的语音转写为文字稿。",
    usage: ["视频转文字"],
    defaults: { baseUrl: DOUBAO_DEFAULT_BASE_URL, resourceId: DOUBAO_DEFAULT_RESOURCE_ID },
  },
  LLM: {
    name: "Kimi AI",
    description: "用于素材分析、深度创作包、多平台内容生成和 AI 内容检查。",
    usage: ["内容拆解", "深度创作包", "多平台生成", "AI 审核"],
    defaults: { provider: "kimi" },
  },
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
        connectionTest: provider === "REDFOX" || provider === "DOUBAO_ASR" || provider === "LLM"
          ? "LIVE_API_TEST_NOT_AVAILABLE" as const
          : "UNSUPPORTED_UNTIL_PROVIDER_STAGE" as const,
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
      usage: ["素材文件与音视频保存"],
      defaults: {},
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
