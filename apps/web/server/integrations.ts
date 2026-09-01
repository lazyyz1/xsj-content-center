export type IntegrationDisplayStatus = "Configured" | "Unconfigured" | "Error" | "Mock";

function hasEvery(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export function getIntegrationStatuses(): Array<{
  name: string;
  status: IntegrationDisplayStatus;
  description: string;
}> {
  const mockMode = process.env.MOCK_MODE === "true";
  const external = (configured: boolean): IntegrationDisplayStatus =>
    mockMode ? "Mock" : configured ? "Configured" : "Unconfigured";

  return [
    {
      name: "红狐 API",
      status: external(hasEvery("REDFOX_BASE_URL", "REDFOX_API_KEY")),
      description: "内容来源能力，本阶段未接入。",
    },
    {
      name: "豆包 ASR",
      status: external(hasEvery("DOUBAO_ASR_BASE_URL", "DOUBAO_ASR_APP_ID", "DOUBAO_ASR_ACCESS_TOKEN")),
      description: "语音转写能力，本阶段未接入。",
    },
    {
      name: "LLM",
      status: external(hasEvery("LLM_PROVIDER", "LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL")),
      description: "生成能力，本阶段未接入。",
    },
    {
      name: "Storage",
      status: hasEvery("S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY")
        ? "Configured"
        : "Unconfigured",
      description: "S3-compatible 对象存储。",
    },
  ];
}
