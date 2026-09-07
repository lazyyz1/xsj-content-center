import { randomUUID } from "node:crypto";
import { db, ensurePersonalWorkspaceForUser } from "@content-center/db";
import { expect, test } from "@playwright/test";
import { auth } from "../lib/auth";

const runId = randomUUID();
const email = `methods-${runId}@example.test`;
const otherEmail = `methods-other-${runId}@example.test`;
const password = "safe-e2e-password";

test.afterAll(async () => {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const workspaces = await db.workspace.findMany({ where: { members: { some: { userId: user.id } } }, select: { id: true } });
    await db.methodAsset.deleteMany({ where: { workspaceId: { in: workspaces.map(({ id }) => id) } } });
    await db.workspace.deleteMany({ where: { id: { in: workspaces.map(({ id }) => id) } } });
  }
  await db.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
  await db.$disconnect();
});

function sessionCookies(response: Response) {
  return response.headers.getSetCookie().map((header) => {
    const [pair] = header.split(";", 1);
    const separator = pair!.indexOf("=");
    return { name: pair!.slice(0, separator), value: pair!.slice(separator + 1), domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" as const };
  });
}

async function signIn(page: import("@playwright/test").Page) {
  const response = await auth.api.signUpEmail({ body: { name: "Methods Owner", email, password }, asResponse: true });
  expect(response.ok).toBe(true);
  const body = await response.clone().json() as { user: { id: string } };
  await ensurePersonalWorkspaceForUser(db, { userId: body.user.id });
  await page.context().addCookies(sessionCookies(response));
  return db.user.findUniqueOrThrow({ where: { id: body.user.id }, include: { workspaceMemberships: true } });
}

function understanding(quote: string) {
  const evidence = [{ quote, segmentIndex: 0, startMs: 1_000, endMs: 4_000 }];
  const section = { summary: "先说清问题，再进入处理方式。", evidence };
  return {
    whatItSays: { summary: "这条内容说明先确认问题，再给出处理方式。", keyPoints: ["先说问题", "再给方法"], evidence },
    expression: { audience: section, opening: section, progression: { summary: "从问题到方法逐步推进。", steps: ["问题", "解释", "方法"], evidence }, support: section, emotionalOrRhetoricalShift: section, ending: section },
    methods: { evidenceStatus: "SINGLE_SOURCE_DRAFT" as const, reason: "这条内容提供了一个可试用的表达方法。", items: [{ title: "先说问题，再进入方案", howTo: ["先说清用户正在遇到的问题，再进入你的处理方式。"], applicable: ["需要解释复杂问题时"], boundaries: ["只有一条素材依据，不能当作稳定规律。"], evidence }] },
    reusable: [{ content: "先拆信息再表达", whyUseful: "便于让复杂内容更容易理解。" }],
    doNotCopy: [],
    uncertain: [],
  };
}

test("saves, edits, versions, and privately manages an M1 method", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const user = await signIn(page);
  const workspaceId = user.workspaceMemberships[0]!.workspaceId;
  const quote = "先说清用户正在遇到的问题，再进入你的处理方式。";
  const source = await db.sourceItem.create({ data: { workspaceId, createdById: user.id, sourceType: "VIDEO", sourcePlatform: "DOUYIN", title: "方法来源视频", status: "READY", transcript: { create: { workspaceId, provider: "LOCAL_FUNASR", providerMode: "REAL", fullText: quote, segments: [{ startMs: 1_000, endMs: 4_000, text: quote }] } } } });
  const transcript = await db.transcript.findUniqueOrThrow({ where: { sourceItemId: source.id } });
  const analysis = await db.materialAnalysis.create({ data: { workspaceId, sourceItemId: source.id, createdById: user.id, version: 1, status: "COMPLETED", tags: [], keywords: [], keyPoints: ["先说问题", "再给方法"], summary: "先确认问题，再给出处理方式。", understanding: understanding(quote), transcriptUpdatedAtAtAnalysis: transcript.updatedAt } });

  await page.goto(`/library/${source.id}`);
  const card = page.getByTestId("material-analysis-card");
  await expect(card).toContainText("可以借鉴的方法");
  await expect(card.getByRole("button", { name: "保存到我的方法" })).toBeVisible();
  await card.getByRole("button", { name: "保存到我的方法" }).click();
  await expect(card.getByRole("button", { name: "保存方法", exact: true })).toBeVisible();
  await card.getByRole("button", { name: "保存方法", exact: true }).click();
  await expect(card).toContainText("已保存到我的方法");

  await page.getByRole("link", { name: "查看我的方法", exact: true }).click();
  await expect(page).toHaveURL(/\/library\/methods$/);
  await expect(page.getByRole("link", { name: /先说问题，再进入方案/ })).toBeVisible();
  await page.getByRole("link", { name: /先说问题，再进入方案/ }).click();
  const detail = page.getByTestId("method-detail");
  await expect(detail).toContainText("仅自己可见");
  await expect(detail).toContainText("方法来源视频");
  await expect(detail).toContainText("查看");
  await detail.getByRole("button", { name: "编辑方法" }).click();
  await detail.getByLabel("方法名称").fill("先说问题，再给方案");
  await detail.getByLabel("怎么用").fill("先说清问题\n再给出自己的处理方式");
  await detail.getByRole("button", { name: "保存方法", exact: true }).click();
  await expect(detail).toContainText("方法已保存，新版本已经保留");
  await expect(detail).toContainText("先说问题，再给方案");
  await expect(detail).toContainText("第 2 次修改");

  await detail.getByRole("button", { name: "试用中", exact: true }).click();
  await expect(detail).toContainText("试用中");
  await db.transcript.update({ where: { id: transcript.id }, data: { fullText: `${quote} 来源后来更新。` } });
  await page.reload();
  await expect(page.getByTestId("method-detail")).toContainText("来源文字稿后来更新过");
  await expect(page.getByTestId("method-detail")).toContainText("查看当前来源");
  await page.getByTestId("method-detail").getByRole("button", { name: "常用", exact: true }).click();
  await expect(page.getByTestId("method-detail")).toContainText("方法状态已更新");
  expect(await page.getByTestId("method-detail").innerText()).not.toMatch(/MethodAsset|MethodVersion|PRIVATE|STALE|workspaceId|Transcript ID|Database|optimistic/);

  const methodId = (await db.methodAsset.findFirstOrThrow({ where: { workspaceId, ownerUserId: user.id } })).id;
  const otherRegistration = await auth.api.signUpEmail({ body: { name: "Methods Other", email: otherEmail, password }, asResponse: true });
  const otherBody = await otherRegistration.clone().json() as { user: { id: string } };
  await db.workspaceMember.create({ data: { workspaceId, userId: otherBody.user.id, role: "EDITOR" } });
  const otherContext = await browser.newContext({ baseURL: process.env.APP_URL ?? "http://localhost:3000" });
  await otherContext.addCookies(sessionCookies(otherRegistration));
  const otherPage = await otherContext.newPage();
  expect((await otherPage.request.get(`/api/methods/${methodId}`)).status()).toBe(404);
  expect((await otherPage.goto(`/library/methods/${methodId}`))?.status()).toBe(404);
  await otherContext.close();

  const blockedDelete = await page.request.delete(`/api/source-items/${source.id}`);
  expect(blockedDelete.status()).toBe(409);
  await db.workspaceMember.update({ where: { workspaceId_userId: { workspaceId, userId: user.id } }, data: { role: "VIEWER" } });
  await page.reload();
  await expect(page.getByTestId("method-detail").getByRole("button", { name: "编辑方法" })).toHaveCount(0);
  expect((await page.request.patch(`/api/methods/${methodId}`, { data: { status: "TRIAL" } })).status()).toBe(403);
  await expect(db.methodAsset.count({ where: { workspaceId, ownerUserId: user.id } })).resolves.toBe(1);
  await expect(db.methodAsset.findUniqueOrThrow({ where: { id: methodId } })).resolves.toMatchObject({ status: "CORE" });
  await expect(db.methodVersion.count({ where: { assetId: methodId } })).resolves.toBe(2);
  expect(analysis.id).toBeTruthy();
});
