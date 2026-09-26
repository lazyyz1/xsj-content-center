import { randomUUID } from "node:crypto";
import { db, ensurePersonalWorkspaceForUser } from "@content-center/db";
import { expect, test, type BrowserContext } from "@playwright/test";
import { auth } from "../lib/auth";

let workspaceId = "";
let ownerId = "";
let viewerId = "";
let textId = "";
let videoId = "";
let ownerCookies: Parameters<BrowserContext["addCookies"]>[0] = [];
let viewerCookies: Parameters<BrowserContext["addCookies"]>[0] = [];
function cookies(response: Response) { return response.headers.getSetCookie().map((value) => { const pair = value.split(";")[0]!; const i = pair.indexOf("="); return { name: pair.slice(0, i), value: pair.slice(i + 1), domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" as const }; }); }
test.beforeAll(async () => {
  const suffix = randomUUID();
  const owner = await auth.api.signUpEmail({ body: { name: "Source owner", email: `source-owner-${suffix}@example.test`, password: "source-workspace-safe-password" }, asResponse: true });
  const viewer = await auth.api.signUpEmail({ body: { name: "Source viewer", email: `source-viewer-${suffix}@example.test`, password: "source-workspace-safe-password" }, asResponse: true });
  ownerId = (await owner.clone().json() as { user: { id: string } }).user.id;
  viewerId = (await viewer.clone().json() as { user: { id: string } }).user.id;
  workspaceId = (await ensurePersonalWorkspaceForUser(db, { userId: ownerId })).id;
  await db.workspaceMember.create({ data: { workspaceId, userId: viewerId, role: "VIEWER" } });
  ownerCookies = cookies(owner); viewerCookies = cookies(viewer);
  textId = (await db.sourceItem.create({ data: { workspaceId, createdById: ownerId, sourceType: "TEXT", title: "Source workspace text", rawText: "第一段原始正文\n第二段待查找的内容", status: "READY" } })).id;
  videoId = (await db.sourceItem.create({ data: { workspaceId, createdById: ownerId, sourceType: "VIDEO", title: "Source workspace video", status: "READY", transcript: { create: { workspaceId, provider: "MANUAL", providerMode: "REAL", fullText: "有效时间片段", segments: [{ startMs: 1000, endMs: 3000, text: "有效时间片段" }] } } } })).id;
});
test.afterAll(async () => { if (workspaceId) await db.workspace.delete({ where: { id: workspaceId } }); await db.user.deleteMany({ where: { id: { in: [ownerId, viewerId] } } }); await db.$disconnect(); });

test("source workspace persists preview preferences, saves raw text, renames and links conversation", async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.context().addCookies(ownerCookies);
  await page.setViewportSize({ width: 1680, height: 945 });
  await page.goto(`/library/${textId}`);
  await expect(page.getByRole("heading", { name: "Source workspace text", exact: true })).toBeVisible();
  await expect(page.getByText("AI 一句话总结", { exact: true })).toHaveCount(0);
  await page.getByLabel("预览比例").selectOption("9/16");
  await page.getByLabel("画面适配").selectOption("cover");
  await page.reload();
  await expect(page.getByLabel("预览比例")).toHaveValue("9/16");
  await page.getByLabel("搜索文字内容").fill("第二段");
  await expect(page.locator(".source-text-content")).toContainText("第二段待查找");
  await expect(page.locator(".source-text-content")).not.toContainText("第一段原始");
  await page.locator(".source-text").getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByLabel("编辑资料文字").fill("这是编辑后保存的正文。");
  await page.getByRole("button", { name: "保存文字" }).click();
  await expect.poll(async () => (await db.sourceItem.findUniqueOrThrow({ where: { id: textId } })).rawText).toBe("这是编辑后保存的正文。");
  await page.getByLabel("搜索文字内容").fill("");
  await page.getByRole("button", { name: "编辑资料标题" }).click();
  await page.getByRole("dialog", { name: "编辑资料标题" }).getByLabel("名称").fill("重命名的资料");
  await page.getByRole("dialog", { name: "编辑资料标题" }).getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("heading", { name: "重命名的资料", exact: true })).toBeVisible();
  for (const width of [390, 768, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 945 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    const box = await page.locator(".source-viewer").boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: info.outputPath(`source-workspace-${width}.png`) });
  }
  await page.getByRole("button", { name: "基于此资料对话", exact: true }).click();
  await expect(page).toHaveURL(/dashboard\?project=/);
  const id = new URL(page.url()).searchParams.get("project")!;
  expect(await db.projectSource.count({ where: { projectId: id, sourceItemId: textId } })).toBe(1);
  expect(await db.materialAnalysis.count({ where: { sourceItemId: textId } })).toBe(0);
});

test("single-screen text fills the workspace and only the text pane scrolls", async ({ page }) => {
  await page.context().addCookies(ownerCookies);
  await db.sourceItem.update({ where: { id: textId }, data: { rawText: Array.from({ length: 120 }, (_, index) => `第 ${index + 1} 段：用于验证长正文独立滚动，页面本身不产生纵向滚动。`).join("\n") } });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/library/${textId}`);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  await page.getByRole("button", { name: "专注阅读", exact: true }).click();
  await expect(page.locator(".source-preview-slot")).toBeHidden();
  await expect(page.getByRole("complementary", { name: "资料属性与操作" })).toBeHidden();
  const area = await page.locator(".source-text-content").boundingBox();
  expect(area!.height).toBeGreaterThan(450);
  expect(area!.width).toBeGreaterThan(1100);
  expect(await page.locator(".source-text-content").evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await page.locator(".source-text-content").evaluate((element) => { element.scrollTop = 600; });
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole("button", { name: "显示预览与属性" }).click();
  await expect(page.locator(".source-preview-slot")).toBeVisible();
  await page.getByRole("button", { name: "资料管理", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "资料管理", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭资料管理" }).click();
  await page.getByRole("button", { name: "来源与处理", exact: true }).click();
  await page.getByRole("navigation", { name: "资料属性分类" }).getByRole("button", { name: "处理与文件" }).click();
  await expect(page.getByRole("heading", { name: "处理状态", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
});

test("transcript updates remove stale timings and stale writes return 409", async ({ page }) => {
  await page.context().addCookies(ownerCookies);
  await page.goto(`/library/${videoId}`);
  await expect(page.getByRole("button", { name: "SRT", exact: true })).toBeVisible();
  const original = await db.transcript.findUniqueOrThrow({ where: { sourceItemId: videoId } });
  const response = await page.request.put(`/api/source-items/${videoId}/transcript`, { data: { fullText: "更新后的转录正文", expectedUpdatedAt: original.updatedAt.toISOString() } });
  expect(response.status()).toBe(200);
  expect((await db.transcript.findUniqueOrThrow({ where: { sourceItemId: videoId } })).segments).toEqual([]);
  expect((await page.request.put(`/api/source-items/${videoId}/transcript`, { data: { fullText: "过期写入", expectedUpdatedAt: original.updatedAt.toISOString() } })).status()).toBe(409);
  await page.reload();
  await expect(page.getByRole("button", { name: "SRT", exact: true })).toHaveCount(0);
  await expect(page.locator(".source-text-content")).toContainText("更新后的转录正文");
});

test("viewer reads source workspace but cannot modify or start a project", async ({ page }) => {
  await page.context().addCookies(viewerCookies);
  await page.goto(`/library/${textId}`);
  await expect(page.getByRole("button", { name: "编辑资料标题" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "基于此资料对话" })).toHaveCount(0);
  expect((await page.request.patch(`/api/source-items/${textId}`, { data: { action: "UPDATE", title: "Denied" } })).status()).toBe(403);
  expect((await page.request.put(`/api/source-items/${textId}/transcript`, { data: { fullText: "Denied" } })).status()).toBe(403);
  expect((await page.request.post(`/api/projects`, { data: { title: "Denied", sourceItemId: textId } })).status()).toBe(403);
});
