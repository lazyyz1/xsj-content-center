import { randomUUID } from "node:crypto";
import { db } from "@content-center/db";
import { IntegrationService } from "@content-center/integrations";
import { expect, test } from "@playwright/test";

const runId = randomUUID();
const email = `configuration-owner-${runId}@example.test`;
const otherEmail = `configuration-other-${runId}@example.test`;
const password = "safe-e2e-password";
const redfoxSecret = `redfox-${runId}`;
const doubaoSecret = `doubao-${runId}`;
const kimiSecret = `kimi-${runId}`;

test.afterAll(async () => {
  const users = await db.user.findMany({ where: { email: { in: [email, otherEmail] } }, select: { id: true } });
  const userIds = users.map(({ id }) => id);
  if (userIds.length > 0) await db.workspace.deleteMany({ where: { members: { some: { userId: { in: userIds } } } } });
  await db.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
  await db.$disconnect();
});

test("API Configuration Center securely configures RedFox, Doubao, and Kimi", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("姓名").fill("Configuration Owner");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "创建账号" }).click();
  await page.getByLabel("Workspace 名称").fill("Configuration Workspace");
  await page.getByRole("button", { name: "创建 Workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("完成 AI 服务配置")).toBeVisible();

  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const membership = await db.workspaceMember.findFirstOrThrow({ where: { userId: user.id } });
  await page.goto("/settings/integrations");
  await expect(page.getByRole("heading", { name: "AI 与外部服务" })).toBeVisible();

  const redfox = page.getByLabel("RedFox 配置");
  await expect(redfox.getByLabel("RedFox Base URL")).toHaveValue("https://redfox.hk");
  await redfox.getByLabel("RedFox Base URL").fill("https://redfox.example.invalid");
  await redfox.getByLabel("RedFox API Key").fill(redfoxSecret);
  await redfox.getByRole("button", { name: "保存配置" }).click();
  await expect(redfox.getByText("已配置", { exact: true })).toBeVisible();
  await expect(redfox.getByLabel("RedFox 已保存凭证")).toContainText(redfoxSecret.slice(-4));

  const doubao = page.getByLabel("豆包语音识别 配置");
  await expect(doubao.getByLabel("豆包语音识别 Resource ID")).toHaveValue("volc.bigasr.auc_turbo");
  await doubao.getByLabel("豆包语音识别 API Key").fill(doubaoSecret);
  await doubao.getByRole("button", { name: "保存配置" }).click();
  await expect(doubao.getByText("已配置", { exact: true })).toBeVisible();

  const kimi = page.getByLabel("Kimi AI 配置");
  await expect(kimi.getByText("当前模型：Kimi 2.6")).toBeVisible();
  await expect(kimi.getByText("Kimi 2.7")).toHaveCount(0);
  await expect(kimi.getByText("自定义模型")).toHaveCount(0);
  await kimi.getByLabel("Kimi AI Base URL").fill("https://kimi.example.invalid/v1");
  await kimi.getByLabel("Kimi AI API Key").fill(kimiSecret);
  await kimi.getByLabel("Kimi AI API Model ID").fill("confirmed-kimi-model-id");
  await kimi.getByRole("button", { name: "保存配置" }).click();
  await expect(kimi.getByText("已配置", { exact: true })).toBeVisible();

  for (const secret of [redfoxSecret, doubaoSecret, kimiSecret]) {
    expect(await page.locator("body").innerText()).not.toContain(secret);
    expect(await page.content()).not.toContain(secret);
  }

  await page.reload();
  for (const name of ["RedFox", "豆包语音识别", "Kimi AI"]) {
    await expect(page.getByLabel(`${name} 配置`).getByText("已配置", { exact: true })).toBeVisible();
  }
  for (const secret of [redfoxSecret, doubaoSecret, kimiSecret]) expect(await page.content()).not.toContain(secret);

  const storedKimiBefore = await db.integrationConfig.findUniqueOrThrow({
    where: { workspaceId_provider: { workspaceId: membership.workspaceId, provider: "LLM" } },
  });
  expect(storedKimiBefore.encryptedConfig).not.toContain(kimiSecret);

  await page.getByLabel("Kimi AI 配置").getByLabel("Kimi AI API Model ID").fill("updated-kimi-model-id");
  const kimiUpdateResponse = page.waitForResponse((response) => response.url().endsWith("/api/integrations/LLM") && response.request().method() === "PUT");
  await page.getByLabel("Kimi AI 配置").getByRole("button", { name: "保存配置" }).click();
  expect((await kimiUpdateResponse).status()).toBe(200);
  const service = new IntegrationService();
  await expect(service.getDecryptedIntegrationConfig(membership.workspaceId, "LLM")).resolves.toMatchObject({ apiKey: kimiSecret, model: "updated-kimi-model-id" });
  await expect(page.getByLabel("Kimi AI 配置").getByLabel("Kimi AI 已保存凭证")).toContainText(kimiSecret.slice(-4));
  expect(await page.content()).not.toContain(kimiSecret);

  const modelOverride = await page.request.put("/api/integrations/llm", { data: { config: { integrationType: "KIMI", productModel: "KIMI_2_6", baseUrl: "https://kimi.example.invalid/v1", apiModelId: "approved-id", model: "browser-override" } } });
  expect(modelOverride.status()).toBe(400);

  const redfoxPublicUpdate = await page.request.put("/api/integrations/redfox", { data: { config: { baseUrl: "https://changed-redfox.example.invalid" } } });
  expect(redfoxPublicUpdate.status()).toBe(200);
  await expect(service.getDecryptedIntegrationConfig(membership.workspaceId, "REDFOX")).resolves.toMatchObject({ apiKey: redfoxSecret, baseUrl: "https://changed-redfox.example.invalid" });

  const replacementSecret = `replacement-${runId}`;
  const redfoxReplacement = await page.request.put("/api/integrations/redfox", { data: { config: { baseUrl: "https://changed-redfox.example.invalid", apiKey: replacementSecret } } });
  expect(redfoxReplacement.status()).toBe(200);
  const redfoxReplacementText = await redfoxReplacement.text();
  expect(redfoxReplacementText).not.toContain(replacementSecret);
  expect((JSON.parse(redfoxReplacementText) as { lastFour: string }).lastFour).toBe(replacementSecret.slice(-4));

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "EDITOR" } });
  const editorUpdate = await page.request.put("/api/integrations/redfox", { data: { config: { baseUrl: "https://forbidden.invalid", apiKey: "editor-must-not-save" } } });
  expect(editorUpdate.status()).toBe(403);
  const editorRead = await page.request.get("/api/integrations/redfox");
  expect(await editorRead.json()).toMatchObject({ status: "CONFIGURED", publicConfig: {}, lastFour: null });
  await page.reload();
  await expect(page.getByLabel("Kimi AI API Model ID")).toHaveCount(0);

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "VIEWER" } });
  const viewerUpdate = await page.request.put("/api/integrations/llm", { data: { config: { integrationType: "KIMI", productModel: "KIMI_2_6", baseUrl: "https://forbidden.invalid", apiKey: "viewer-must-not-save", apiModelId: "forbidden" } } });
  expect(viewerUpdate.status()).toBe(403);

  const otherUser = await db.user.create({ data: { name: "Other Configuration User", email: otherEmail } });
  const otherWorkspace = await db.workspace.create({
    data: { name: "Other Configuration Workspace", slug: `other-configuration-${runId}`, members: { create: { userId: otherUser.id, role: "OWNER" } } },
  });
  const otherSecret = `other-${runId}`;
  await service.saveIntegrationConfig({ workspaceId: otherWorkspace.id, userId: otherUser.id, provider: "REDFOX", config: { baseUrl: "https://other.example.invalid", apiKey: otherSecret } });
  const isolatedResponse = await page.request.get("/api/integrations/redfox");
  const isolatedText = await isolatedResponse.text();
  expect(isolatedText).not.toContain(otherSecret);
  expect(isolatedText).not.toContain(otherSecret.slice(-4));
  expect(isolatedText).not.toContain("https://other.example.invalid");
});
