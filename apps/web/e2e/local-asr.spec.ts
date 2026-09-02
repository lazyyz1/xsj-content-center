import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { db } from "@content-center/db";
import { IntegrationService } from "@content-center/integrations";
import { minioStorageFromEnv } from "@content-center/providers";
import { createContentIngestWorker, createTranscribeSourceWorker } from "@content-center/worker/queue";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const runId = randomUUID();
const email = `local-asr-e2e-${runId}@example.test`;
const password = "safe-e2e-password";
const douyinUrl = "https://www.douyin.com/video/local-asr-e2e-fixture";
let fixture: Server;
let fixtureOrigin = "";
let videoBody: Buffer;
let temporaryDirectory = "";
let ingestWorker: ReturnType<typeof createContentIngestWorker>;
let transcriptionWorker: ReturnType<typeof createTranscribeSourceWorker>;

test.beforeAll(async () => {
  const health = await fetch("http://127.0.0.1:8765/health");
  expect(health.ok, "pnpm dev:asr must be running for this real-model E2E").toBe(true);

  temporaryDirectory = await mkdtemp(join(tmpdir(), "content-center-local-asr-e2e-"));
  const videoPath = join(temporaryDirectory, "fixture.mp4");
  const repositoryRoot = process.cwd().endsWith(join("apps", "web")) ? resolve(process.cwd(), "../..") : process.cwd();
  const audioPath = join(repositoryRoot, "services/local-asr/benchmark/audio/normal_zh.wav");
  await execFileAsync("ffmpeg", [
    "-nostdin", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", "color=c=black:s=160x90:d=8",
    "-i", audioPath,
    "-shortest", "-c:v", "libx264", "-c:a", "aac", "-y", videoPath,
  ]);
  videoBody = await readFile(videoPath);
  fixture = createServer(async (request, response) => {
    if (request.url === "/story/api/parseWork/parse") {
      response.writeHead(200, { "content-type": "application/json", "x-request-id": "local-asr-redfox-log" });
      response.end(JSON.stringify({
        code: 200,
        data: {
          awemeType: "video",
          platform: "dy",
          title: "RedFox 到本地 FunASR 真实链路",
          videoUrl: `${fixtureOrigin}/fixture.mp4`,
        },
      }));
      return;
    }
    if (request.url === "/fixture.mp4") {
      response.writeHead(200, { "content-type": "video/mp4", "content-length": videoBody.byteLength });
      response.end(videoBody);
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise<void>((resolveListen) => fixture.listen(0, "127.0.0.1", resolveListen));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("Local ASR E2E fixture did not bind");
  fixtureOrigin = `http://127.0.0.1:${address.port}`;
  process.env.INGEST_TEST_FIXTURE_ORIGIN = fixtureOrigin;
  ingestWorker = createContentIngestWorker();
  transcriptionWorker = createTranscribeSourceWorker();
  await Promise.all([ingestWorker.waitUntilReady(), transcriptionWorker.waitUntilReady()]);
});

test.afterAll(async () => {
  await Promise.all([ingestWorker.close(), transcriptionWorker.close()]);
  await new Promise<void>((resolveClose) => fixture.close(() => resolveClose()));
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const workspace = await db.workspace.findFirst({ where: { members: { some: { userId: user.id } } }, select: { id: true } });
    if (workspace) {
      const assets = await db.sourceAsset.findMany({ where: { workspaceId: workspace.id }, select: { storageKey: true } });
      for (const asset of assets) if (asset.storageKey) await minioStorageFromEnv().delete(asset.storageKey);
      await db.workspace.delete({ where: { id: workspace.id } });
    }
    await db.user.delete({ where: { id: user.id } });
  }
  await db.$disconnect();
  await rm(temporaryDirectory, { recursive: true, force: true });
  delete process.env.INGEST_TEST_FIXTURE_ORIGIN;
});

test("saved RedFox video is transcribed by the real local model without Doubao", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/register");
  await page.getByLabel("姓名").fill("Local ASR E2E Owner");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "创建账号" }).click();
  await page.getByLabel("Workspace 名称").fill("Local ASR E2E Workspace");
  await page.getByRole("button", { name: "创建 Workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/settings/integrations");
  await expect(page.getByLabel("语音转写配置").getByText("本地服务正常", { exact: true }).first()).toBeVisible();
  await page.getByLabel("RedFox Base URL").fill(fixtureOrigin);
  await page.getByLabel("RedFox API Key").fill("redfox-local-asr-e2e-key");
  await page.getByLabel("RedFox 配置").getByRole("button", { name: "保存配置" }).click();
  await expect(page.getByLabel("RedFox 已保存凭证")).toBeVisible();

  await page.goto("/library");
  await page.getByRole("button", { name: "收录内容" }).click();
  await page.getByRole("button", { name: "抖音视频" }).click();
  await page.getByLabel("抖音分享链接或分享文案").fill(douyinUrl);
  await page.getByRole("button", { name: "提交收录" }).click();
  await page.getByRole("link", { name: "查看素材" }).click();

  await expect(page.getByText("今天我们来聊一聊如何把零散素材整理成清晰可靠的内容项目", { exact: false }))
    .toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("本地转写", { exact: true })).toBeVisible();
  await expect(page.getByText("均衡", { exact: true })).toBeVisible();

  const sourceId = new URL(page.url()).pathname.split("/").pop();
  if (!sourceId) throw new Error("Missing source id");
  const source = await db.sourceItem.findUniqueOrThrow({ where: { id: sourceId }, include: { transcript: true } });
  expect(source.transcript).toMatchObject({ provider: "LOCAL_FUNASR", providerMode: "REAL" });
  const metadata = source.transcript?.metadata as { method?: string; qualityMode?: string; technical?: { model?: string; device?: string } } | null;
  expect(metadata).toMatchObject({ method: "LOCAL", qualityMode: "BALANCED", technical: { device: "CUDA" } });
  expect(await db.integrationConfig.count({ where: { workspaceId: source.workspaceId, provider: "DOUBAO_ASR" } })).toBe(0);
  const usage = await db.apiUsage.findFirstOrThrow({ where: { workspaceId: source.workspaceId, provider: "LOCAL_FUNASR", operation: "TRANSCRIBE_LOCAL" } });
  expect(usage.success).toBe(true);
  expect(usage.cost?.toString()).toBe("0");

  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await new IntegrationService().saveIntegrationConfig({
    workspaceId: source.workspaceId,
    userId: user.id,
    provider: "TRANSCRIPTION",
    config: {
      source: "LOCAL_FUNASR",
      qualityMode: "BALANCED",
      selectionMode: "AUTO",
      fallbackToDoubao: false,
      endpoint: "http://127.0.0.1:1",
    },
  });
  const jobCount = await db.ingestJob.count({ where: { sourceItemId: sourceId, jobType: "TRANSCRIBE" } });
  const failure = await page.request.post(`/api/source-items/${sourceId}/transcribe`);
  expect(failure.status()).toBe(503);
  await expect(failure.json()).resolves.toMatchObject({ error: "LOCAL_ASR_NOT_RUNNING" });
  expect(await db.ingestJob.count({ where: { sourceItemId: sourceId, jobType: "TRANSCRIBE" } })).toBe(jobCount);
  expect(await db.apiUsage.count({ where: { workspaceId: source.workspaceId, provider: "DOUBAO_ASR" } })).toBe(0);
});
