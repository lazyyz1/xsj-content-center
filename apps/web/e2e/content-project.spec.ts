import { randomUUID } from "node:crypto";
import { db } from "@content-center/db";
import { expect, test } from "@playwright/test";

const runId = randomUUID();
const email = `project-e2e-${runId}@example.test`;
const otherEmail = `project-e2e-other-${runId}@example.test`;
const password = "safe-e2e-password";

test.afterAll(async () => {
  const users = await db.user.findMany({ where: { email: { in: [email, otherEmail] } }, select: { id: true } });
  const userIds = users.map(({ id }) => id);
  if (userIds.length) await db.workspace.deleteMany({ where: { members: { some: { userId: { in: userIds } } } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

test("library source → project → evidence → brief → mother content → review with isolation", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("姓名").fill("Project E2E User");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "创建账号" }).click();
  await page.getByLabel("Workspace 名称").fill("Project E2E Workspace");
  await page.getByRole("button", { name: "创建 Workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const user = await db.user.findUniqueOrThrow({ where: { email }, include: { workspaceMemberships: true } });
  const workspaceId = user.workspaceMemberships[0]!.workspaceId;
  const source = await db.sourceItem.create({ data: { workspaceId, createdById: user.id, sourceType: "TEXT", sourcePlatform: "GENERIC", status: "READY", title: "阶段四素材", rawText: "这是一条用于真实项目闭环的素材正文。" } });

  await page.goto("/library");
  await page.getByRole("link", { name: "阶段四素材" }).click();
  await page.getByLabel("新项目名称").fill("阶段四真实创作项目");
  await page.getByRole("button", { name: "用此素材新建项目" }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/studio$/);
  const projectId = new URL(page.url()).pathname.split("/")[2]!;
  await expect(page.getByRole("paragraph").filter({ hasText: "阶段四素材" })).toBeVisible();

  await page.getByLabel("Evidence 观点").fill("素材支持阶段四核心观点");
  await page.getByLabel("Evidence 摘录").fill("真实项目闭环的素材正文");
  await page.getByRole("button", { name: "新增 Evidence" }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: "素材支持阶段四核心观点" })).toBeVisible();

  await page.getByLabel("选题").fill("阶段四创作工作台");
  await page.getByLabel("核心观点").fill("先组织证据，再写可靠母稿");
  await page.getByLabel("关键要点（每行一点）").fill("素材关联\n证据整理\n人工审核");
  await page.getByRole("button", { name: "保存 Brief" }).click();
  await expect(page.getByText("已保存", { exact: true }).last()).toBeVisible();

  await page.getByRole("button", { name: "开始研究" }).click();
  await expect(page.getByRole("button", { name: "确认 Brief 完成" })).toBeVisible();
  await page.getByRole("button", { name: "确认 Brief 完成" }).click();
  await expect(page.getByRole("button", { name: "开始写作" })).toBeVisible();
  await page.getByRole("button", { name: "开始写作" }).click();
  await expect(page.getByRole("button", { name: "提交人工审核" })).toBeVisible();

  await page.getByLabel("母稿标题").fill("阶段四母稿");
  await page.getByLabel("母稿大纲").fill("开场\n论证\n结尾");
  await page.getByLabel("母稿正文").fill("这是经过素材与 Evidence 支撑的真实持久化母稿正文。");
  await expect.poll(async () => (await db.motherContent.findUnique({ where: { projectId } }))?.body, { timeout: 10_000 }).toBe("这是经过素材与 Evidence 支撑的真实持久化母稿正文。");
  await page.getByRole("button", { name: "提交人工审核" }).click();
  await expect(page.getByRole("button", { name: "批准母稿" })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("母稿标题")).toHaveValue("阶段四母稿");
  await expect(page.getByLabel("母稿正文")).toHaveValue("这是经过素材与 Evidence 支撑的真实持久化母稿正文。");
  await expect(page.getByLabel("选题")).toHaveValue("阶段四创作工作台");
  await expect(page.getByRole("paragraph").filter({ hasText: "素材支持阶段四核心观点" })).toBeVisible();

  const otherUser = await db.user.create({ data: { name: "Other Project User", email: otherEmail } });
  const otherWorkspace = await db.workspace.create({ data: { name: "Other Project Workspace", slug: `project-other-${runId}`, members: { create: { userId: otherUser.id, role: "OWNER" } } } });
  const otherProject = await db.contentProject.create({ data: { workspaceId: otherWorkspace.id, createdById: otherUser.id, title: "Other private project" } });
  expect((await page.request.get(`/api/projects/${otherProject.id}`)).status()).toBe(404);
  expect((await page.request.post(`/api/projects/${otherProject.id}/sources`, { data: { sourceItemId: source.id, role: "REFERENCE" } })).status()).toBe(404);
  expect((await db.contentProject.findUniqueOrThrow({ where: { id: projectId } })).status).toBe("IN_REVIEW");
});
