import { randomUUID } from "node:crypto";
import { db, ensurePersonalWorkspaceForUser } from "@content-center/db";
import { expect, test } from "@playwright/test";
import { auth } from "../lib/auth";

const runId = randomUUID();
const email = `m12-shell-${runId}@example.test`;
const password = "safe-m12-shell-password";
let userId = "";
let workspaceId = "";
let projectId = "";

function sessionCookies(response: Response) {
  return response.headers.getSetCookie().map((header) => {
    const [pair] = header.split(";", 1); const separator = pair!.indexOf("=");
    return { name: pair!.slice(0, separator), value: pair!.slice(separator + 1), domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" as const };
  });
}

test.beforeAll(async () => {
  const registration = await auth.api.signUpEmail({ body: { name: "M12 Visual QA", email, password }, asResponse: true });
  const body = await registration.clone().json() as { user: { id: string } };
  userId = body.user.id;
  const workspace = await ensurePersonalWorkspaceForUser(db, { userId });
  workspaceId = workspace.id;
  const project = await db.contentProject.create({ data: { workspaceId, createdById: userId, title: "M12 响应式稿件", creativeBrief: { create: { workspaceId, createdById: userId, topic: "真实选题", angle: "直接表达", audience: "内容团队", coreMessage: "先说清问题", background: "", keyPoints: [], structure: [], tone: "自然", risks: [] } }, motherContent: { create: { workspaceId, createdById: userId, title: "真实稿件", body: "这是用于验证新版 Studio 布局的真实测试稿件。", outline: ["开头", "正文"] } } } });
  projectId = project.id;
});

test.afterAll(async () => {
  if (workspaceId) await db.workspace.delete({ where: { id: workspaceId } });
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});

test.beforeEach(async ({ page }) => {
  const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  await page.context().addCookies(sessionCookies(response));
});

test("M12 task-first shell keeps six primary destinations and never overflows", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "从一个想法开始，把内容做得更清楚" })).toBeVisible();
  for (const label of ["开始创作", "项目", "灵感研究", "资料", "方法", "发布"]) await expect(page.getByRole("link", { name: label, exact: true }).first()).toBeVisible();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
  await expect(page.getByRole("button", { name: "打开导航" })).toBeVisible();
});

test("M12 core pages and Studio V2 preserve real routes and responsive panes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [path, heading] of [["/projects", "项目"], ["/discovery", "灵感研究"], ["/library", "资料"], ["/projects/methods", "方法"], ["/calendar", "发布中心"]] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
  await page.goto(`/projects/${projectId}/studio`);
  await expect(page.getByLabel("口播稿正文")).toHaveValue(/新版 Studio 布局/);
  await expect(page.locator(".studio-context-column")).toBeVisible();
  await expect(page.locator(".studio-editor-column")).toBeVisible();
  await expect(page.locator(".studio-ai-column")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "创作上下文" })).toBeVisible();
  await expect(page.getByRole("button", { name: "AI 助手" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await page.locator("main.app-main").innerText()).not.toMatch(/AIRun|ApiUsage|MethodUsage|SourceOwnership|CONFIRMED_OWN_FACT|EXTERNAL_FACT|Provider|Schema|JSON/);
});
