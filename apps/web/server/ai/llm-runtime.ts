import "server-only";

import { IntegrationService } from "@content-center/integrations";
import { LLMError, MockLLMProvider, OpenAICompatibleLLMProvider, openAICompatibleConfigSchema, type LLMProvider } from "@content-center/providers";

export type LLMRuntime = { provider: LLMProvider; providerName: string; model: string };

function mockFixture(prompt: string) {
  if (prompt.includes("Action: ANALYZE_SOURCES")) return { topics: ["MOCK MODE 主题"], coreClaims: [], facts: [], cases: [], questions: [], hooks: [], structures: [], risks: [], reusableInsights: [] };
  if (prompt.includes("Action: EXTRACT_EVIDENCE")) return { items: [{ type: "FACT", excerpt: "MOCK MODE 摘录", claim: "MOCK MODE 观点", note: "仅用于显式开发模式", sourceItemId: null }] };
  if (prompt.includes("Action: GENERATE_ANGLES")) return { angles: Array.from({ length: 5 }, (_, index) => ({ title: `MOCK MODE 角度 ${index + 1}`, angle: `MOCK MODE 差异化视角 ${index + 1}`, coreMessage: "MOCK MODE 核心观点", whyItWorks: "显式开发测试", targetAudience: "测试用户", recommendedStructure: ["开头", "论证", "结尾"], risk: "MOCK MODE", evidenceIds: [], sourceItemIds: [] })) };
  if (prompt.includes("Action: GENERATE_BRIEF")) return { topic: "MOCK MODE Brief", angle: "MOCK MODE 角度", audience: "测试用户", coreMessage: "MOCK MODE 核心观点", keyPoints: ["测试要点"], structure: ["开头", "正文"], tone: "自然", risks: ["MOCK MODE"], evidenceIds: [], sourceItemIds: [] };
  if (prompt.includes("Action: GENERATE_MOTHER_CONTENT")) return { title: "MOCK MODE 母稿", outline: ["开头", "正文"], body: "MOCK MODE：这是显式开发模式生成的母稿。", evidenceIds: [], sourceItemIds: [] };
  if (prompt.includes("Action: ADAPT_PLATFORM") && prompt.includes("Target: DOUYIN")) return { hook: "MOCK MODE 开场", title: "MOCK MODE 抖音标题", body: "MOCK MODE：抖音口播稿。", hashtags: ["MOCKMODE"], mediaPlan: { duration: 60, shotSuggestions: ["固定机位口播"] } };
  if (prompt.includes("Action: ADAPT_PLATFORM") && prompt.includes("Target: XIAOHONGSHU")) return { titles: ["MOCK MODE 标题一", "MOCK MODE 标题二", "MOCK MODE 标题三"], body: "MOCK MODE：小红书正文。", hashtags: ["MOCKMODE"], coverTitles: ["MOCK MODE 封面"], mediaPlan: { imageIdeas: ["文字卡片"] } };
  if (prompt.includes("Action: ADAPT_PLATFORM") && prompt.includes("Target: WECHAT_MOMENTS")) return { variants: [{ type: "SHORT", body: "MOCK MODE：短版。" }, { type: "VIEWPOINT", body: "MOCK MODE：观点版。" }, { type: "STORY", body: "MOCK MODE：故事版。" }] };
  if (prompt.includes("Action: ADAPT_PLATFORM") && prompt.includes("Target: WECHAT_CHANNELS")) return { title: "MOCK MODE 视频号标题", hook: "MOCK MODE 开场", body: "MOCK MODE：视频号口播稿。", description: "MOCK MODE 简介", hashtags: ["MOCKMODE"] };
  if (prompt.includes("Action: ADAPT_PLATFORM") && prompt.includes("Target: WECHAT_OFFICIAL")) return { title: "MOCK MODE 公众号标题", summary: "MOCK MODE 摘要", body: "MOCK MODE：公众号正文。", outline: ["导语", "正文", "结尾"] };
  const match = prompt.match(/"selectedText":\s*("(?:[^"\\]|\\.)*")/);
  const original = match ? JSON.parse(match[1]!) as string : "MOCK MODE 原文";
  return { original, aiVersion: `MOCK MODE：${original}` };
}

export async function loadLLMRuntime(workspaceId: string, service = new IntegrationService()): Promise<LLMRuntime> {
  const status = await service.getIntegrationStatus(workspaceId, "LLM");
  if (status.status === "DISABLED") throw new LLMError("LLM_DISABLED", "AI 模型已禁用。", false);
  if (status.status !== "CONFIGURED") {
    if (process.env.MOCK_MODE === "true") return { provider: new MockLLMProvider(({ prompt }) => mockFixture(prompt)), providerName: "MOCK", model: "mock-llm" };
    throw new LLMError("LLM_NOT_CONFIGURED", "尚未配置 AI 模型。", false);
  }
  const config = await service.getDecryptedIntegrationConfig(workspaceId, "LLM");
  const parsed = openAICompatibleConfigSchema.safeParse(config);
  if (!parsed.success) throw new LLMError("LLM_NOT_CONFIGURED", "AI 模型配置不完整。", false);
  return { provider: new OpenAICompatibleLLMProvider(parsed.data), providerName: parsed.data.provider, model: parsed.data.model };
}
