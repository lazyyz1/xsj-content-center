import { randomUUID } from "node:crypto";
import { db } from "@content-center/db";
import { IntegrationService } from "@content-center/integrations";
import { expect, test } from "@playwright/test";

const runId = randomUUID();
const email = `integration-owner-${runId}@example.test`;
const otherEmail = `integration-other-${runId}@example.test`;
const password = "safe-e2e-password";
const originalSecret = "test-secret-random-value";
const adminSecret = `admin-fake-${runId}`;
const otherSecret = `other-fake-${runId}-zz99`;

test.afterAll(async () => {
  const users = await db.user.findMany({ where: { email: { in: [email, otherEmail] } }, select: { id: true } });
  const userIds = users.map(({ id }) => id);
  if (userIds.length > 0) await db.workspace.deleteMany({ where: { members: { some: { userId: { in: userIds } } } } });
  await db.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
  await db.$disconnect();
});

test("OWNER securely saves, refreshes, authorizes, isolates, and deletes RedFox credentials", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("姓名").fill("Integration Owner");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "创建账号" }).click();
  await page.getByLabel("Workspace 名称").fill("Integration Workspace");
  await page.getByRole("button", { name: "创建 Workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const membership = await db.workspaceMember.findFirstOrThrow({ where: { userId: user.id } });
  await page.goto("/settings/integrations");
  await page.getByLabel("红狐 API Base URL").fill("https://example.invalid");
  await page.getByLabel("红狐 API API Key").fill(originalSecret);
  await page.getByRole("button", { name: "保存红狐 API" }).click();
  await expect(page.getByLabel("红狐 API 已保存凭证")).toContainText(`••••${originalSecret.slice(-4)}`);
  await expect(page.locator("body")).not.toContainText(originalSecret);

  const stored = await db.integrationConfig.findUniqueOrThrow({
    where: { workspaceId_provider: { workspaceId: membership.workspaceId, provider: "REDFOX" } },
  });
  expect(stored.encryptedConfig).not.toContain(originalSecret);
  expect(JSON.stringify(stored.publicConfig)).not.toContain(originalSecret);
  const audits = await db.auditLog.findMany({ where: { resourceId: stored.id } });
  expect(JSON.stringify(audits)).not.toContain(originalSecret);

  const apiResponse = await page.request.get("/api/integrations/redfox");
  expect(apiResponse.status()).toBe(200);
  const apiText = await apiResponse.text();
  expect(apiText).not.toContain(originalSecret);
  expect(apiText).not.toContain("encryptedConfig");
  expect(apiText).not.toContain("ciphertext");

  await page.reload();
  await expect(page.getByLabel("红狐 API 已保存凭证")).toContainText(`••••${originalSecret.slice(-4)}`);
  await expect(page.locator("body")).not.toContainText(originalSecret);

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "ADMIN" } });
  const adminUpdate = await page.request.put("/api/integrations/redfox", {
    data: { config: { baseUrl: "https://example.invalid", apiKey: adminSecret } },
  });
  expect(adminUpdate.status()).toBe(200);
  expect(await adminUpdate.text()).not.toContain(adminSecret);
  const service = new IntegrationService();
  await expect(service.getDecryptedIntegrationConfig(membership.workspaceId, "REDFOX")).resolves.toMatchObject({ apiKey: adminSecret });

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "EDITOR" } });
  const editorUpdate = await page.request.put("/api/integrations/redfox", {
    data: { config: { baseUrl: "https://example.invalid", apiKey: "editor-must-not-save" } },
  });
  expect(editorUpdate.status()).toBe(403);
  expect(await editorUpdate.text()).not.toContain("editor-must-not-save");
  const editorRead = await page.request.get("/api/integrations/redfox");
  expect(await editorRead.json()).toMatchObject({ status: "CONFIGURED", publicConfig: {}, lastFour: null });

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "VIEWER" } });
  const viewerDelete = await page.request.delete("/api/integrations/redfox");
  expect(viewerDelete.status()).toBe(403);

  const otherUser = await db.user.create({ data: { name: "Other Integration User", email: otherEmail } });
  const otherWorkspace = await db.workspace.create({
    data: {
      name: "Other Integration Workspace",
      slug: `other-integration-${runId}`,
      members: { create: { userId: otherUser.id, role: "OWNER" } },
    },
  });
  await service.saveIntegrationConfig({
    workspaceId: otherWorkspace.id,
    userId: otherUser.id,
    provider: "REDFOX",
    config: { baseUrl: "https://other.example.invalid", apiKey: otherSecret },
  });
  const isolatedResponse = await page.request.get("/api/integrations/redfox");
  const isolatedText = await isolatedResponse.text();
  expect(isolatedText).not.toContain(otherSecret);
  expect(isolatedText).not.toContain(otherSecret.slice(-4));
  expect(isolatedText).not.toContain("https://other.example.invalid");

  await db.workspaceMember.update({ where: { id: membership.id }, data: { role: "OWNER" } });
  await page.reload();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).first().click();
  await expect(page.getByRole("heading", { name: "红狐 API" })).toBeVisible();
  await expect(page.getByLabel("红狐 API 已保存凭证")).toHaveCount(0);
  await expect(db.integrationConfig.findUnique({ where: { workspaceId_provider: { workspaceId: membership.workspaceId, provider: "REDFOX" } } })).resolves.toBeNull();
});
