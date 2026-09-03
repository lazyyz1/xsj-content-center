import "server-only";

import {
  CONFIGURABLE_INTEGRATION_PROVIDERS,
  DOUBAO_DEFAULT_BASE_URL,
  DOUBAO_DEFAULT_RESOURCE_ID,
  IntegrationService,
  type ConfigurableIntegrationProvider,
} from "@content-center/integrations";
import { REDFOX_DEFAULT_BASE_URL, storageHealthFromEnv } from "@content-center/providers";

export type IntegrationDisplayStatus = "CONFIGURED" | "UNCONFIGURED" | "NEEDS_RECONFIGURATION" | "ERROR" | "DISABLED" | "MOCK";

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
    description: "为内容发现与素材收录提供抖音、小红书内容数据。",
    usage: ["内容发现", "抖音 / 小红书素材收录"],
    defaults: { baseUrl: REDFOX_DEFAULT_BASE_URL },
  },
  DOUBAO_ASR: {
    name: "豆包语音识别",
    description: "将视频中的语音转写为文字稿。",
    usage: ["视频转文字"],
    defaults: { baseUrl: DOUBAO_DEFAULT_BASE_URL, resourceId: DOUBAO_DEFAULT_RESOURCE_ID },
  },
  TRANSCRIPTION: {
    name: "语音转写策略",
    description: "选择本地免费转写或豆包云端服务，并设置本地质量目标。",
    usage: ["视频转文字"],
    defaults: { source: "LOCAL_FUNASR", qualityMode: "BALANCED" },
  },
  LLM: {
    name: "Kimi AI",
    description: "用于素材分析、深度创作包、多平台内容生成和 AI 内容检查。",
    usage: ["内容拆解", "深度创作包", "多平台生成", "AI 审核"],
    defaults: { integrationType: "KIMI", productModel: "KIMI_2_6" },
  },
};

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
  const storageConfigured = storageHealthFromEnv() === "CONFIGURED";
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
