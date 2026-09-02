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
  for (const tab of ["整理", "信息", "创作", "处理"]) await expect(page.getByRole("tab", { name: tab })).toBeVisible();
  for (const tab of ["信息", "创作", "处理", "整理"]) await page.getByRole("tab", { name: tab }).click();
  expect(calls).toBe(0);
  await expect(page.getByTestId("transcript-scroll-region")).toHaveCSS("overflow-y", "auto");
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByLabel("编辑转写全文").fill("内容团队常常收集很多视频；编辑后的转写仍应保留在固定高度工作区。 ");
  await page.getByRole("button", { name: "保存转写" }).click();
  await expect(page.getByTestId("transcript-scroll-region")).toContainText("编辑后的转写仍应保留");
  await expect(card).toContainText("尚未整理");
  await page.getByRole("button", { name: "开始智能整理" }).click();
  await expect(card).toContainText("已智能整理");
  await expect(card).toContainText("先整理素材，再开始创作");
  expect(calls).toBe(1);

  await page.getByRole("button", { name: "编辑整理" }).click();
  await page.getByLabel("主题").fill("人工确认后的主题");
  await page.getByLabel("标签（逗号分隔，最多 8 个）").fill("素材整理，人工标签，人工标签");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(card).toContainText("人工确认后的主题");
  await expect(db.contentTag.findFirst({ where: { workspaceId: membership.workspaceId, slug: "人工标签" } })).resolves.toBeTruthy();

  await page.getByRole("button", { name: "重新整理" }).click();
  await expect(card).toContainText("当前版本不会删除");
  await page.getByRole("button", { name: "确认重新整理" }).click();
  await expect(card).toContainText("第二版：先整理素材，再开始创作");
  await expect(db.materialAnalysis.count({ where: { sourceItemId: source.id } })).resolves.toBe(2);

  for (const viewport of [{ width: 375, height: 812 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole("button", { name: "素材工作栏" }).click();
    await expect(page.getByRole("dialog", { name: "素材工作栏" })).toBeVisible();
    await page.getByRole("button", { name: "关闭", exact: true }).click();
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  const callsBeforeProject = calls;
  await page.getByRole("tab", { name: "创作" }).click();
  await page.getByRole("button", { name: "基于这条素材创作" }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/studio$/);
  const projectId = page.url().match(/\/projects\/([^/]+)\/studio$/)?.[1];
  expect(projectId).toBeTruthy();
  expect(calls).toBe(callsBeforeProject);
  await expect(page.getByText("已整理", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /待整理视频/ }).click();
  await expect(page.getByRole("dialog", { name: "待整理视频" })).toContainText("素材智能整理");
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "编辑方案" }).click();
  await expect(page.getByLabel("主题")).toHaveValue("素材智能整理");
  await expect(page.getByLabel("目标受众")).toHaveValue("内容创作者");
  await expect(page.getByLabel("核心问题")).toHaveValue("如何减少素材进入创作流程前的信息损耗？");
  await expect(page.getByLabel("素材核心观点")).toHaveValue("原始素材应先变成可编辑、可追溯的理解结果。");
  await expect(page.getByLabel("关键要点（每行一点）")).toContainText("元数据提供市场信号");
  await expect(page.getByLabel("参考内容摘要")).toHaveValue("这条素材说明了创作前进行结构化整理的价值。");
  await expect(page.getByLabel("建议切入角度")).toHaveValue("");

  await page.getByLabel("目标受众").fill("人工调整后的受众");
  await page.getByLabel("核心问题").fill("人工确认后真正要解决什么？");
  await page.getByRole("button", { name: "保存创作方案" }).click();
  await expect(page.getByRole("status")).toHaveText("创作方案已保存");
  await page.reload();
  await page.getByRole("button", { name: "编辑方案" }).click();
  await expect(page.getByLabel("目标受众")).toHaveValue("人工调整后的受众");
  await expect(page.getByLabel("核心问题")).toHaveValue("人工确认后真正要解决什么？");

  await page.goto(`/library/${source.id}`);
  await page.getByRole("button", { name: "重新整理" }).click();
  await page.getByRole("button", { name: "确认重新整理" }).click();
  await expect.poll(() => db.materialAnalysis.count({ where: { sourceItemId: source.id, status: "COMPLETED" } })).toBe(3);
  await expect(page.getByTestId("material-analysis-card")).toContainText("第二版：先整理素材，再开始创作");
  await page.goto(`/projects/${projectId}/studio`);
  await expect(page.getByText("素材整理已有新版本，当前方案不会被自动覆盖。")).toBeVisible();
  await page.getByRole("button", { name: "编辑方案" }).click();
  await expect(page.getByLabel("目标受众")).toHaveValue("人工调整后的受众");
  await expect(page.getByLabel("核心问题")).toHaveValue("人工确认后真正要解决什么？");

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("heading", { name: "AI 创作助手" })).toBeVisible();
  await expect(page.getByLabel("目标受众")).toHaveValue("人工调整后的受众");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "VIEWER" } });
  const forbiddenBrief = await page.request.put(`/api/projects/${projectId}/brief`, { data: { topic: "不允许修改", expectedVersion: 2 } });
  expect(forbiddenBrief.status()).toBe(403);
  await page.goto(`/library/${source.id}`);
  await expect(page.getByTestId("material-analysis-card")).toContainText("第二版：先整理素材，再开始创作");
  await expect(page.getByRole("button", { name: "编辑整理" })).toHaveCount(0);
  const forbidden = await page.request.post(`/api/source-items/${source.id}/material-analysis`);
  expect(forbidden.status()).toBe(403);
  const forbiddenTranscript = await page.request.put(`/api/source-items/${source.id}/transcript`, { data: { fullText: "VIEWER 不允许修改" } });
  expect(forbiddenTranscript.status()).toBe(403);
});

test("unconfigured Kimi is explicit and never creates a fake analysis", async ({ page }) => {
  const user = await register(page, unconfiguredEmail, "Material Analysis Unconfigured");
  const workspaceId = user.workspaceMemberships[0]!.workspaceId;
  const source = await db.sourceItem.create({ data: { workspaceId, createdById: user.id, sourceType: "VIDEO", sourcePlatform: "DOUYIN", title: "未配置素材", status: "READY", transcript: { create: { workspaceId, provider: "LOCAL_FUNASR", providerMode: "REAL", fullText: "已有转写，但没有配置 Kimi。", segments: [] } } } });
  await page.goto(`/library/${source.id}`);
  await expect(page.getByTestId("material-analysis-card")).toContainText("Kimi 2.6 尚未配置");
  await expect(page.getByRole("button", { name: "开始智能整理" })).toHaveCount(0);
  await expect(db.materialAnalysis.count({ where: { sourceItemId: source.id } })).resolves.toBe(0);

  const oldProject = await db.contentProject.create({ data: { workspaceId, createdById: user.id, title: "旧项目兼容性", sources: { create: { sourceItemId: source.id, role: "REFERENCE" } } } });
  await page.goto(`/projects/${oldProject.id}/studio`);
  await expect(page.getByRole("heading", { name: "旧项目兼容性" })).toBeVisible();
  await expect(page.getByText("创作准备已完成", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "编辑方案" }).click();
  await expect(page.getByLabel("主题")).toHaveValue("");
});
