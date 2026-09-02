import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { db } from "@content-center/db";
import { IntegrationService } from "@content-center/integrations";
import { expect, test } from "@playwright/test";

const runId = randomUUID();
const email = `unified-analysis-${runId}@example.test`;
const unconfiguredEmail = `unified-analysis-unconfigured-${runId}@example.test`;
const password = "safe-e2e-password";
let fixture: Server;
let fixtureOrigin = "";
let fixtureSourceId = "";
let calls = 0;

function result() {
  calls += 1;
  return {
    creativeInterpretation: { text: "这条素材适合从证据缺失造成的返工切入。", classification: "AI_INTERPRETATION", sourceItemIds: [fixtureSourceId] },
    angles: [{ title: "从返工成本切入", angle: "先展示没有来源依据会如何拖慢创作。", rationale: "与素材核心问题直接相关", classification: "AI_SUGGESTION", sourceItemIds: [fixtureSourceId] }],
    structure: { overallApproach: "问题—依据—行动", classification: "AI_SUGGESTION", sourceItemIds: [fixtureSourceId], sections: [{ title: "返工问题", purpose: "建立冲突", keyMessage: "缺少来源会增加返工。", supportingPoints: ["来源不可追溯"], sourceItemIds: [fixtureSourceId] }, { title: "解决方法", purpose: "给出路径", keyMessage: "先分析，再创作。", supportingPoints: ["统一上下文"], sourceItemIds: [fixtureSourceId] }] },
    expressionDirection: { description: "直接、具体、避免口号。", rationale: "适合内容团队", classification: "AI_SUGGESTION", sourceItemIds: [fixtureSourceId] },
    riskNotes: [{ text: "不要把来源观点写成已验证事实。", classification: "AI_INTERPRETATION", sourceItemIds: [fixtureSourceId] }],
    titleReferences: [{ title: "为什么 AI 内容总在返工？", rationale: "突出实际成本", classification: "AI_SUGGESTION", sourceItemIds: [fixtureSourceId] }],
  };
}

test.beforeAll(async () => {
  fixture = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += String(chunk); });
    request.on("end", () => {
      const parsed = JSON.parse(body) as { messages: Array<{ content: string }> };
      const prompt = parsed.messages.at(-1)?.content ?? "";
      expect(prompt).toContain("Action: UNIFIED_CREATIVE_ANALYSIS");
      response.writeHead(request.headers.authorization === "Bearer unified-analysis-key" ? 200 : 401, { "content-type": "application/json", "x-request-id": `unified-${calls + 1}` });
      response.end(JSON.stringify({ id: `unified-${calls + 1}`, model: "kimi-2.6-fixture", choices: [{ message: { content: JSON.stringify(result()) } }], usage: { prompt_tokens: 130, completion_tokens: 70 } }));
    });
  });
  await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("Unified analysis fixture did not bind");
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

test("one unified AI action returns a grounded analysis, caches identical input, and never overwrites the Brief", async ({ page }) => {
  test.setTimeout(90_000);
  const user = await register(page, email, "Unified Analysis Owner");
  const membership = user.workspaceMemberships[0]!;
  await new IntegrationService().saveIntegrationConfig({ workspaceId: membership.workspaceId, userId: user.id, provider: "LLM", mode: "FIXTURE", config: { provider: "fixture-openai-compatible", baseUrl: fixtureOrigin, apiKey: "unified-analysis-key", model: "kimi-2.6-fixture" } });
  const source = await db.sourceItem.create({ data: { workspaceId: membership.workspaceId, createdById: user.id, sourceType: "TEXT", sourcePlatform: "GENERIC", status: "READY", title: "统一分析素材", rawText: "可靠创作需要明确问题、绑定来源，并保留人工判断。" } });
  fixtureSourceId = source.id;
  const created = await page.request.post("/api/projects", { data: { title: "统一创作分析项目", goal: "减少无依据创作", audience: "内容团队", sourceItemId: source.id } });
  expect(created.status()).toBe(201);
  const projectId = (await created.json() as { id: string }).id;
  expect(calls).toBe(0);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/projects/${projectId}/studio`);
  expect(calls).toBe(0);
  await expect(page.getByRole("button", { name: "AI 深度分析" })).toHaveCount(1);
  for (const label of ["生成结构", "分析角度", "分析风险", "生成标题建议", "生成创作角度", "生成创作简报"]) await expect(page.getByRole("button", { name: label })).toHaveCount(0);

  await page.getByRole("button", { name: "AI 深度分析" }).click();
  await expect(page.getByRole("status")).toContainText("AI 分析完成");
  await expect(page.getByRole("heading", { name: "创作理解" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "可选切入角度" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "结构建议" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "素材依据" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "风险提醒" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "标题参考" })).toBeVisible();
  await expect(page.getByText("为什么 AI 内容总在返工？")).toBeVisible();
  expect(calls).toBe(1);
  await expect(page.getByLabel("目标受众")).toHaveValue("");

  await page.reload();
  await expect(page.getByText("AI 分析已是最新 · v1")).toBeVisible();
  expect(calls).toBe(1);
  const cached = await page.request.post(`/api/projects/${projectId}/ai/run`, { data: { action: "UNIFIED_CREATIVE_ANALYSIS" } });
  expect(cached.status()).toBe(201);
  expect((await cached.json() as { cached: boolean }).cached).toBe(true);
  expect(calls).toBe(1);

  await page.getByLabel("目标受众").fill("人工确认后的受众");
  await page.getByRole("button", { name: "保存创作简报" }).click();
  await expect(page.getByText("创作信息已更新，可更新 AI 分析。旧分析不会覆盖当前创作简报。")).toBeVisible();
  await page.getByRole("button", { name: "更新 AI 分析" }).click();
  await expect(page.getByText("AI 分析完成", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
  await expect(page.getByLabel("目标受众")).toHaveValue("人工确认后的受众");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "AI 与创作简报" }).click();
  await expect(page.getByTestId("unified-creative-analysis")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "VIEWER" } });
  const forbidden = await page.request.post(`/api/projects/${projectId}/ai/run`, { data: { action: "UNIFIED_CREATIVE_ANALYSIS" } });
  expect(forbidden.status()).toBe(403);
});

test("unconfigured LLM is explicit and exposes no active AI analysis action", async ({ page }) => {
  const user = await register(page, unconfiguredEmail, "Unified Analysis Unconfigured");
  const workspaceId = user.workspaceMemberships[0]!.workspaceId;
  const project = await db.contentProject.create({ data: { workspaceId, createdById: user.id, title: "No LLM Project" } });
  await page.goto(`/projects/${project.id}/studio`);
  await expect(page.getByText("尚未配置 AI 模型", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "AI 深度分析" })).toHaveCount(0);
});
