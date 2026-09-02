import { db } from "@content-center/db";
import { expect, test } from "@playwright/test";

const email = `e2e-${Date.now()}@example.test`;
const otherEmail = `e2e-other-${Date.now()}@example.test`;
const password = "safe-e2e-password";

test.afterAll(async () => {
  const users = await db.user.findMany({
    where: { email: { in: [email, otherEmail] } },
    select: { id: true },
  });
  const userIds = users.map(({ id }) => id);
  if (userIds.length > 0) {
    await db.workspace.deleteMany({
      where: { members: { some: { userId: { in: userIds } } } },
    });
  }
  await db.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
  await db.$disconnect();
});

test("register → onboarding → dashboard → integrations → logout → login", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("姓名").fill("E2E User");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "创建账号" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Workspace 名称").fill("E2E Workspace");
  await page.getByRole("button", { name: "创建 Workspace" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "今天从哪里开始？" })).toBeVisible();
  await expect(page.getByText("素材").first()).toBeVisible();

  const otherUser = await db.user.create({
    data: { name: "Other User", email: otherEmail },
  });
  const otherWorkspace = await db.workspace.create({
    data: {
      name: "Other Workspace",
      slug: `other-${Date.now()}`,
      members: { create: { userId: otherUser.id, role: "OWNER" } },
    },
  });
  const crossWorkspaceResponse = await page.request.get(`/api/workspaces/${otherWorkspace.id}`);
  expect(crossWorkspaceResponse.status()).toBe(404);

  await page.getByRole("link", { name: "设置" }).click();
  await page.getByRole("link", { name: "AI 与外部服务" }).click();
  await expect(page.getByRole("heading", { name: "AI 与外部服务" })).toBeVisible();
  await expect(page.getByText("未配置").first()).toBeVisible();
  await expect(page.getByText("已配置").first()).toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
