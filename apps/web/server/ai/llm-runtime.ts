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
  if (prompt.includes("Action: GENERATE_DEEP_CONTENT_PACKAGE")) return {
    topicPackage: { coreTopic: "MOCK MODE 深度选题", coreQuestion: "如何先研究再创作？", candidateTopics: [{ title: "先研究再创作", angle: "研究优先", targetAudience: "内容团队", conflict: "快速生成与可靠创作", novelty: "把创作包交给最终主笔", whyWorthDoing: "减少无依据表达", differenceFromSources: "重新组织命题与观点" }] },
    viewpointPackage: { mainViewpoint: "可靠创作先整理证据和判断。", supportingViewpoints: ["研究与最终写作应分工"], counterArguments: ["直接生成更快"], commonBeliefs: ["模型越强就越不需要研究"], ourJudgement: "速度不能替代事实边界。", deeperImplications: ["创作流程需要可追溯"] },
    evidencePackage: { items: [] },
    expressionPackage: { hooks: [{ type: "CONTRARIAN", text: "最会写的模型，也不该跳过研究。" }, { type: "QUESTION", text: "为什么内容越生成越空？" }, { type: "CASE", text: "一个常见的失败流程。" }, { type: "DIRECT_JUDGEMENT", text: "先研究，再创作。" }, { type: "BOSS_VIEW", text: "内容负责人真正要管的是事实边界。" }, { type: "STORY", text: "上一次赶稿让我重新看待创作流程。" }], goldenLines: ["速度不能替代事实边界。"], questions: [], analogies: [], conflictLines: [], transitions: [], endingIdeas: [], ctaIdeas: [] },
    structurePackage: { structures: [{ type: "CONTRARIAN", name: "反常识", whySuitable: "直接建立冲突", steps: ["误区", "判断", "方法"] }, { type: "STORY", name: "故事", whySuitable: "降低理解门槛", steps: ["场景", "转折", "结论"] }, { type: "VIEWPOINT", name: "观点", whySuitable: "突出立场", steps: ["判断", "论证", "行动"] }], recommendedStructure: "反常识" },
    creatorContribution: { personalViews: [], personalExperiences: [], personalCases: [], professionalKnowledge: [], positions: [], preferredExpressions: [], brandPrinciples: [], forbiddenExpressions: [] },
    recommendedDirection: "使用反常识结构，交给高级主笔完成成稿。", risks: ["MOCK MODE"], needsConfirmation: [],
  };
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
