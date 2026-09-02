import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { db } from "@content-center/db";
import { IntegrationService } from "@content-center/integrations";
import { expect, test } from "@playwright/test";

const runId = randomUUID();
const email = `ai-e2e-${runId}@example.test`;
const unconfiguredEmail = `ai-unconfigured-${runId}@example.test`;
const password = "safe-e2e-password";
let fixture: Server;
let fixtureOrigin = "";

function resultFor(prompt: string) {
  if (prompt.includes("GENERATE_ANGLES")) return { angles: [{ title: "从失败捷径切入", angle: "先展示无证据创作为什么失效", coreMessage: "可靠二创从证据组织开始", whyItWorks: "有明确冲突", targetAudience: "内容团队", recommendedStructure: ["失败场景", "证据方法", "行动建议"], risk: "避免绝对化", evidenceIds: [], sourceItemIds: [] }] };
  if (prompt.includes("GENERATE_BRIEF")) return { topic: "证据驱动的 AI 创作", angle: "从失败捷径切入", audience: "内容团队", coreMessage: "可靠二创从证据组织开始", keyPoints: ["收集来源", "提取证据", "重建结构"], structure: ["问题", "方法", "结论"], tone: "直接、具体", risks: ["不虚构事实"], evidenceIds: [], sourceItemIds: [] };
  if (prompt.includes("GENERATE_MOTHER_CONTENT")) return { title: "AI 写作最容易跳过的一步", outline: ["常见捷径", "证据流程", "落地方法"], body: "很多人一上来就让 AI 写全文，结果往往只得到结构整齐但没有判断的内容。更稳妥的方式，是先整理来源和证据，再选择角度，最后重建母稿结构。", evidenceIds: [], sourceItemIds: [] };
  return { topics: [], coreClaims: [], facts: [], cases: [], questions: [], hooks: [], structures: [], risks: [], reusableInsights: [] };
}

test.beforeAll(async () => {
  fixture = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += String(chunk); });
    request.on("end", () => {
      const parsed = JSON.parse(body) as { messages: Array<{ content: string }> };
      const prompt = parsed.messages.at(-1)?.content ?? "";
      response.writeHead(request.headers.authorization === "Bearer fixture-api-key" ? 200 : 401, { "content-type": "application/json", "x-request-id": "e2e-llm-request" });
      response.end(JSON.stringify({ id: "e2e-completion", model: "fixture-model", choices: [{ message: { content: JSON.stringify(resultFor(prompt)) } }], usage: { prompt_tokens: 101, completion_tokens: 41 } }));
    });
  });
  await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("LLM fixture did not bind");
  fixtureOrigin = `http://127.0.0.1:${address.port}/v1`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => fixture.close(() => resolve()));
  const users = await db.user.findMany({ where: { email: { in: [email, unconfiguredEmail] } }, select: { id: true } });
  const userIds = users.map(({ id }) => id);
  if (userIds.length) await db.workspace.deleteMany({ where: { members: { some: { userId: { in: userIds } } } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

async function register(page: import("@playwright/test").Page, userEmail: string, name: string) {
  await page.goto("/register");
  await page.getByLabel("姓名").fill(name);
  await page.getByLabel("邮箱").fill(userEmail);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "创建账号" }).click();
  await page.getByLabel("Workspace 名称").fill(`${name} Workspace`);
  await page.getByRole("button", { name: "创建 Workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return db.user.findUniqueOrThrow({ where: { email: userEmail }, include: { workspaceMemberships: true } });
}

test("CreatorProfile → angles preview/apply → brief preview/apply → mother preview/apply", async ({ page }) => {
  const user = await register(page, email, "AI E2E User");
  const workspaceId = user.workspaceMemberships[0]!.workspaceId;
  await page.goto("/settings/creator-profile");
  await page.getByLabel("我的定位").fill("帮助内容团队建立可靠 AI 创作流程");
  await page.getByLabel("目标受众").fill("内容团队");
  await page.getByLabel("常做领域（每行一项）").fill("AI 内容生产\n证据整理");
  await page.getByLabel("表达语气").fill("直接、具体");
  await page.getByLabel("常用观点（每行一项）").fill("证据先于写作");
  await page.getByRole("button", { name: "保存创作画像" }).click();
  await expect(page.getByRole("status")).toHaveText("已保存");

  await new IntegrationService().saveIntegrationConfig({ workspaceId, userId: user.id, provider: "LLM", mode: "FIXTURE", config: { provider: "fixture-openai-compatible", baseUrl: fixtureOrigin, apiKey: "fixture-api-key", model: "fixture-model" } });
  const source = await db.sourceItem.create({ data: { workspaceId, createdById: user.id, sourceType: "TEXT", sourcePlatform: "GENERIC", status: "READY", title: "AI 创作素材", rawText: "可靠内容需要来源、证据和明确的创作者判断。" } });
  const created = await page.request.post("/api/projects", { data: { title: "阶段五 AI 项目", goal: "生成可靠母稿", audience: "内容团队", sourceItemId: source.id } });
  expect(created.status()).toBe(201);
  const projectId = (await created.json() as { id: string }).id;
  await page.goto(`/projects/${projectId}/studio`);
  await expect(page.getByText("MOCK MODE", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "生成创作角度" }).click();
  await expect(page.getByRole("heading", { name: "生成创作角度预览" })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "从失败捷径切入" })).toBeVisible();
  await page.getByRole("button", { name: "采用这个角度（1）" }).click();
  await expect(page.getByLabel("切入角度")).toHaveValue("先展示无证据创作为什么失效");

  await page.getByRole("button", { name: "生成创作简报" }).click();
  await expect(page.getByRole("heading", { name: "生成创作简报预览" })).toBeVisible();
  await page.getByRole("button", { name: "应用到创作简报" }).click();
  await expect(page.getByLabel("选题")).toHaveValue("证据驱动的 AI 创作");

  await page.getByRole("button", { name: "生成核心母稿" }).click();
  await expect(page.getByRole("heading", { name: "生成核心母稿预览" })).toBeVisible();
  await expect(page.getByText(/很多人一上来就让 AI 写全文/)).toBeVisible();
  await page.getByRole("button", { name: "应用为母稿" }).click();
  await expect(page.getByLabel("母稿标题")).toHaveValue("AI 写作最容易跳过的一步");
  await page.reload();
  await expect(page.getByLabel("选题")).toHaveValue("证据驱动的 AI 创作");
  await expect(page.getByLabel("母稿正文")).toHaveValue(/先整理来源和证据/);
  const usage = await db.apiUsage.findMany({ where: { workspaceId, provider: "LLM" } });
  expect(usage).toHaveLength(3);
  expect(usage.every((item) => item.inputTokens === 101 && item.outputTokens === 41)).toBe(true);
});

test("unconfigured LLM is explicit and does not expose active AI actions", async ({ page }) => {
  const user = await register(page, unconfiguredEmail, "AI Unconfigured User");
  const workspaceId = user.workspaceMemberships[0]!.workspaceId;
  const project = await db.contentProject.create({ data: { workspaceId, createdById: user.id, title: "No LLM Project" } });
  await page.goto(`/projects/${project.id}/studio`);
  await expect(page.getByText("尚未配置 AI 模型", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "生成创作角度" })).toHaveCount(0);
});
