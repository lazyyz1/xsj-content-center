import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { db } from "@content-center/db";
import { IntegrationService } from "@content-center/integrations";
import { expect, test } from "@playwright/test";

const runId = randomUUID();
const email = `material-analysis-${runId}@example.test`;
const unconfiguredEmail = `material-analysis-unconfigured-${runId}@example.test`;
const password = "safe-e2e-password";
let fixture: Server;
let fixtureOrigin = "";
let calls = 0;

function result() {
  calls += 1;
  return {
    suggestedTitle: calls > 1 ? "第二版：先整理素材，再开始创作" : "先整理素材，再开始创作",
    summary: "这条素材说明了创作前进行结构化整理的价值。",
    topic: "素材智能整理",
    tags: ["素材整理", "内容工作流"],
    keywords: ["转写", "素材库", "Kimi"],
    contentType: "方法讲解",
    targetAudience: "内容创作者",
    coreViewpoint: "原始素材应先变成可编辑、可追溯的理解结果。",
    keyPoints: ["元数据提供市场信号", "转写提供正文上下文", "整理结果需要人工确认"],
    coreQuestion: "如何减少素材进入创作流程前的信息损耗？",
  };
}

test.beforeAll(async () => {
  fixture = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += String(chunk); });
    request.on("end", () => {
      const parsed = JSON.parse(body) as { messages: Array<{ content: string }> };
      const prompt = parsed.messages.at(-1)?.content ?? "";
      expect(prompt).toContain("ANALYZE_MATERIAL");
      expect(prompt).toContain("Do not return hooks, structure");
      expect(prompt).not.toContain("CreatorProfile");
      response.writeHead(request.headers.authorization === "Bearer material-analysis-key" ? 200 : 401, { "content-type": "application/json", "x-request-id": `material-analysis-${calls + 1}` });
      response.end(JSON.stringify({ id: `material-analysis-${calls + 1}`, model: "kimi-2.6-fixture", choices: [{ message: { content: JSON.stringify(result()) } }], usage: { prompt_tokens: 120, completion_tokens: 55 } }));
    });
  });
  await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("Material analysis fixture did not bind");
  fixtureOrigin = `http://127.0.0.1:${address.port}/v1`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => fixture.close(() => resolve()));
  const users = await db.user.findMany({ where: { email: { in: [email, unconfiguredEmail] } }, select: { id: true } });
  const ids = users.map(({ id }) => id);
  if (ids.length) await db.workspace.deleteMany({ where: { members: { some: { userId: { in: ids } } } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
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

test("material detail supports analyze, edit, tags, reanalysis, project handoff and viewer read-only", async ({ page }) => {
  test.setTimeout(90_000);
  const user = await register(page, email, "Material Analysis Owner");
  const membership = user.workspaceMemberships[0]!;
  await new IntegrationService().saveIntegrationConfig({ workspaceId: membership.workspaceId, userId: user.id, provider: "LLM", config: { integrationType: "KIMI", productModel: "KIMI_2_6", baseUrl: fixtureOrigin, apiKey: "material-analysis-key", apiModelId: "kimi-2.6-fixture" } });
  const source = await db.sourceItem.create({ data: { workspaceId: membership.workspaceId, createdById: user.id, sourceType: "VIDEO", sourcePlatform: "DOUYIN", title: "待整理视频", status: "READY", transcript: { create: { workspaceId: membership.workspaceId, provider: "LOCAL_FUNASR", providerMode: "REAL", fullText: "内容团队常常收集很多视频，但如果不先整理主题和观点，真正创作时仍然要重新阅读。", segments: [] } } } });

  await page.goto(`/library/${source.id}`);
  const card = page.getByTestId("material-analysis-card");
  await expect(card).toContainText("尚未整理");
  await page.getByRole("button", { name: "开始智能整理" }).click();
  await expect(card).toContainText("已智能整理");
  await expect(card).toContainText("先整理素材，再开始创作");
  expect(calls).toBe(1);

  await page.getByRole("button", { name: "编辑整理结果" }).click();
  await page.getByLabel("主题").fill("人工确认后的主题");
  await page.getByLabel("标签（逗号分隔，最多 8 个）").fill("素材整理，人工标签，人工标签");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(card).toContainText("人工确认后的主题");
  await expect(db.contentTag.findFirst({ where: { workspaceId: membership.workspaceId, slug: "人工标签" } })).resolves.toBeTruthy();

  await page.getByRole("button", { name: "重新智能整理" }).click();
  await expect(card).toContainText("当前版本不会删除");
  await page.getByRole("button", { name: "确认重新整理" }).click();
  await expect(card).toContainText("第二版：先整理素材，再开始创作");
  await expect(db.materialAnalysis.count({ where: { sourceItemId: source.id } })).resolves.toBe(2);

  for (const viewport of [{ width: 375, height: 812 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(card).toBeVisible();
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole("button", { name: "基于这条素材创作" }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/studio$/);
  await expect(page.getByText("已智能整理", { exact: true })).toBeVisible();
  await page.locator("summary").filter({ hasText: "待整理视频" }).first().click();
  await expect(page.getByText(/主题：素材智能整理/)).toBeVisible();

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "VIEWER" } });
  await page.goto(`/library/${source.id}`);
  await expect(page.getByTestId("material-analysis-card")).toContainText("第二版：先整理素材，再开始创作");
  await expect(page.getByRole("button", { name: "编辑整理结果" })).toHaveCount(0);
  const forbidden = await page.request.post(`/api/source-items/${source.id}/material-analysis`);
  expect(forbidden.status()).toBe(403);
});

test("unconfigured Kimi is explicit and never creates a fake analysis", async ({ page }) => {
  const user = await register(page, unconfiguredEmail, "Material Analysis Unconfigured");
  const workspaceId = user.workspaceMemberships[0]!.workspaceId;
  const source = await db.sourceItem.create({ data: { workspaceId, createdById: user.id, sourceType: "VIDEO", sourcePlatform: "DOUYIN", title: "未配置素材", status: "READY", transcript: { create: { workspaceId, provider: "LOCAL_FUNASR", providerMode: "REAL", fullText: "已有转写，但没有配置 Kimi。", segments: [] } } } });
  await page.goto(`/library/${source.id}`);
  await expect(page.getByTestId("material-analysis-card")).toContainText("Kimi 2.6 尚未配置");
  await expect(page.getByRole("button", { name: "开始智能整理" })).toHaveCount(0);
  await expect(db.materialAnalysis.count({ where: { sourceItemId: source.id } })).resolves.toBe(0);
});
