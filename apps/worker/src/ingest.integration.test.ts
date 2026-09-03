import { createServer, type Server } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@content-center/db";
import { IntegrationService } from "@content-center/integrations";
import { buildSourceAssetObjectKey, minioStorageFromEnv, readSourceMetadataEnvelope } from "@content-center/providers";
import { QueueEvents } from "bullmq";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONTENT_INGEST, CONTENT_INGEST_QUEUE, createContentIngestQueue, createContentIngestWorker } from "./queue";

describe("CONTENT_INGEST integration", () => {
  const originalEncryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  const runId = randomUUID();
  const userId = `ingest-${runId}`;
  let workspaceId = "";
  let fixture: Server | undefined;
  let fixtureOrigin = "";
  let transientRequests = 0;
  let redfoxRequests = 0;
  const worker = createContentIngestWorker();
  const events = new QueueEvents(CONTENT_INGEST_QUEUE, { connection: { host: "localhost", port: 6379 } });

  beforeAll(async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    await db.user.create({ data: { id: userId, name: "Ingest Test", email: `${userId}@example.test` } });
    const workspace = await db.workspace.create({ data: { name: "Ingest Test", slug: `ingest-${runId}`, members: { create: { userId, role: "OWNER" } } } });
    workspaceId = workspace.id;
    const localFixture = createServer(async (request, response) => {
      if (request.url === "/story/api/parseWork/parse") {
        redfoxRequests += 1;
        expect(request.headers["x-api-key"]).toBe("ak_worker_fixture");
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { url: string };
        if (body.url === "https://www.douyin.com/video/worker-failure") {
          response.writeHead(200, { "content-type": "application/json", "x-request-id": "worker-redfox-failure" });
          response.end(JSON.stringify({ code: 400, msg: "fixture parse failure" }));
          return;
        }
        expect(body.url).toBe("https://www.douyin.com/video/worker-fixture");
        response.writeHead(200, { "content-type": "application/json", "x-request-id": "worker-redfox-request" });
        response.end(JSON.stringify({ code: 200, data: { awemeType: "video", platform: "dy", title: "RedFox Worker Fixture", videoUrl: `${fixtureOrigin}/fixture.mp4` } }));
        return;
      }
      if (request.url === "/fixture.mp4") {
        const sourceBeforeDownload = await db.sourceItem.findFirst({ where: { workspaceId, canonicalUrl: "https://www.douyin.com/video/worker-fixture" } });
        expect(readSourceMetadataEnvelope(sourceBeforeDownload?.metadata)?.external).toMatchObject({
          platform: "DOUYIN",
          originalTitle: "RedFox Worker Fixture",
          originalUrl: "https://www.douyin.com/video/worker-fixture",
        });
        const body = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);
        response.writeHead(200, { "content-type": "video/mp4", "content-length": body.length });
        response.end(body);
        return;
      }
      if (request.url === "/transient" && transientRequests++ === 0) {
        response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
        response.end("temporarily unavailable");
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end('<!doctype html><html><head><title>Local Fixture</title><meta name="author" content="Fixture Author"></head><body><article><h1>Local Fixture</h1><p>This local fixture article has enough deterministic text for the real URL extraction integration test.</p><p>No public internet request is performed.</p></article></body></html>');
    });
    fixture = localFixture;
    await new Promise<void>((resolve) => localFixture.listen(0, "127.0.0.1", resolve));
    const address = localFixture.address();
    if (!address || typeof address === "string") throw new Error("Fixture did not bind");
    fixtureOrigin = `http://127.0.0.1:${address.port}`;
    process.env.INGEST_TEST_FIXTURE_ORIGIN = fixtureOrigin;
    await new IntegrationService().saveIntegrationConfig({
      workspaceId,
      userId,
      provider: "REDFOX",
      config: { baseUrl: fixtureOrigin, apiKey: "ak_worker_fixture" },
    });
    await Promise.all([worker.waitUntilReady(), events.waitUntilReady()]);
  });

  afterAll(async () => {
    await Promise.all([
      worker.close(),
      events.close(),
      fixture ? new Promise<void>((resolve) => fixture?.close(() => resolve())) : Promise.resolve(),
    ]);
    if (workspaceId) await db.workspace.delete({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    delete process.env.INGEST_TEST_FIXTURE_ORIGIN;
    if (originalEncryptionKey === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
    else process.env.INTEGRATION_ENCRYPTION_KEY = originalEncryptionKey;
  });

  async function createAndRun(type: "TEXT" | "URL", value: string) {
    const source = await db.sourceItem.create({ data: { workspaceId, createdById: userId, sourceType: type, sourcePlatform: "GENERIC", sourceUrl: type === "URL" ? value : null, rawText: type === "TEXT" ? value : null, status: "PENDING" } });
    const jobRecord = await db.ingestJob.create({ data: { workspaceId, sourceItemId: source.id, requestedById: userId, jobType: type === "TEXT" ? "EXTRACT_TEXT" : "FETCH_URL", provider: type === "TEXT" ? "MANUAL" : "GENERIC_URL", providerMode: "REAL", maxAttempts: 3 } });
    const queue = createContentIngestQueue();
    const queueJob = await queue.add(CONTENT_INGEST, { jobId: jobRecord.id, workspaceId, sourceItemId: source.id, requestedById: userId }, { attempts: 3, removeOnComplete: true, removeOnFail: true });
    return { source, jobRecord, queue, queueJob };
  }

  it("processes manual text into READY and a MANUAL transcript", async () => {
    const run = await createAndRun("TEXT", "Manual integration text stored without pretending to be ASR.");
    await expect(run.queueJob.waitUntilFinished(events, 10_000)).resolves.toMatchObject({ status: "ok" });
    await run.queue.close();
    await expect(db.sourceItem.findUnique({ where: { id: run.source.id } })).resolves.toMatchObject({ status: "READY" });
    await expect(db.transcript.findUnique({ where: { sourceItemId: run.source.id } })).resolves.toMatchObject({ provider: "MANUAL", providerMode: "REAL", fullText: "Manual integration text stored without pretending to be ASR." });
  });

  it("extracts a local fixture URL into READY plain text", async () => {
    const run = await createAndRun("URL", `${fixtureOrigin}/article`);
    await expect(run.queueJob.waitUntilFinished(events, 10_000)).resolves.toMatchObject({ status: "ok" });
    await run.queue.close();
    const source = await db.sourceItem.findUniqueOrThrow({ where: { id: run.source.id } });
    expect(source).toMatchObject({ status: "READY", title: "Local Fixture", author: "Fixture Author" });
    expect(source.rawText).toContain("deterministic text");
    await expect(db.transcript.findUnique({ where: { sourceItemId: run.source.id } })).resolves.toBeNull();
  });

  it("persists a permanent SSRF failure without retrying", async () => {
    const run = await createAndRun("URL", "http://127.0.0.1:9/internal");
    await expect(run.queueJob.waitUntilFinished(events, 10_000)).rejects.toThrow();
    await run.queue.close();
    await expect(db.ingestJob.findUnique({ where: { id: run.jobRecord.id } })).resolves.toMatchObject({ status: "FAILED", attempt: 1, errorCode: "SSRF_BLOCKED" });
    await expect(db.sourceItem.findUnique({ where: { id: run.source.id } })).resolves.toMatchObject({ status: "FAILED" });
  });

  it("keeps BullMQ attempts and the persisted attempt in sync for transient failures", async () => {
    transientRequests = 0;
    const run = await createAndRun("URL", `${fixtureOrigin}/transient`);
    await expect(run.queueJob.waitUntilFinished(events, 10_000)).resolves.toMatchObject({ status: "ok" });
    await run.queue.close();
    await expect(db.ingestJob.findUnique({ where: { id: run.jobRecord.id } })).resolves.toMatchObject({
      status: "SUCCEEDED",
      attempt: 2,
      errorCode: null,
    });
    await expect(db.auditLog.count({ where: { resourceId: run.jobRecord.id, action: "ingest.retried" } })).resolves.toBe(1);
  });

  it("runs Douyin through the REAL RedFox path into MinIO and SourceAsset", async () => {
    redfoxRequests = 0;
    const source = await db.sourceItem.create({
      data: {
        workspaceId,
        createdById: userId,
        sourceType: "VIDEO",
        sourcePlatform: "DOUYIN",
        sourceUrl: "https://www.douyin.com/video/worker-fixture",
        canonicalUrl: "https://www.douyin.com/video/worker-fixture",
        status: "PENDING",
      },
    });
    const jobRecord = await db.ingestJob.create({
      data: {
        workspaceId,
        sourceItemId: source.id,
        requestedById: userId,
        jobType: "PROCESS_MEDIA",
        provider: "REDFOX",
        providerMode: "REAL",
        maxAttempts: 3,
      },
    });
    const queue = createContentIngestQueue();
    const queueJob = await queue.add(CONTENT_INGEST, { jobId: jobRecord.id, workspaceId, sourceItemId: source.id, requestedById: userId }, { attempts: 3, removeOnComplete: true, removeOnFail: true });
    await expect(queueJob.waitUntilFinished(events, 15_000)).resolves.toMatchObject({ status: "ok" });
    await queue.close();

    expect(redfoxRequests).toBe(1);
    const storedSource = await db.sourceItem.findUniqueOrThrow({ where: { id: source.id } });
    expect(storedSource).toMatchObject({ status: "READY", sourceType: "VIDEO", sourcePlatform: "DOUYIN", title: "RedFox Worker Fixture" });
    expect(readSourceMetadataEnvelope(storedSource.metadata)?.ingest).toMatchObject({ awemeType: "video", assetCount: 1 });
    const asset = await db.sourceAsset.findFirstOrThrow({ where: { workspaceId, sourceItemId: source.id } });
    expect(asset).toMatchObject({ status: "STORED", assetType: "VIDEO", sourceProvider: "REDFOX", mimeType: "video/mp4" });
    expect(asset.storageKey).toBe(buildSourceAssetObjectKey({ workspaceId, sourceItemId: source.id, assetId: asset.id, assetType: "VIDEO", mimeType: "video/mp4" }));
    const signedUrl = await minioStorageFromEnv().getSignedUrl(asset.storageKey!);
    const stored = await fetch(signedUrl.data.url);
    expect(stored.status).toBe(200);
    expect(Buffer.from(await stored.arrayBuffer())).toHaveLength(12);
    await expect(db.transcript.findUnique({ where: { sourceItemId: source.id } })).resolves.toBeNull();
    await expect(db.apiUsage.findFirst({ where: { workspaceId, provider: "REDFOX", operation: "PARSE_WORK" } })).resolves.toMatchObject({ success: true, units: 1, cost: null, providerRequestId: "worker-redfox-request" });
  });

  it("leaves a failed RedFox source without media or Transcript", async () => {
    redfoxRequests = 0;
    const source = await db.sourceItem.create({
      data: {
        workspaceId,
        createdById: userId,
        sourceType: "VIDEO",
        sourcePlatform: "DOUYIN",
        sourceUrl: "https://www.douyin.com/video/worker-failure",
        canonicalUrl: "https://www.douyin.com/video/worker-failure",
        status: "PENDING",
      },
    });
    const jobRecord = await db.ingestJob.create({
      data: {
        workspaceId,
        sourceItemId: source.id,
        requestedById: userId,
        jobType: "PROCESS_MEDIA",
        provider: "REDFOX",
        providerMode: "REAL",
        maxAttempts: 3,
      },
    });
    const queue = createContentIngestQueue();
    const queueJob = await queue.add(CONTENT_INGEST, {
      jobId: jobRecord.id,
      workspaceId,
      sourceItemId: source.id,
      requestedById: userId,
    }, { attempts: 3, removeOnComplete: true, removeOnFail: true });
    await expect(queueJob.waitUntilFinished(events, 10_000)).rejects.toThrow();
    await queue.close();

    expect(redfoxRequests).toBe(1);
    await expect(db.sourceItem.findUnique({ where: { id: source.id } })).resolves.toMatchObject({ status: "FAILED" });
    await expect(db.ingestJob.findUnique({ where: { id: jobRecord.id } })).resolves.toMatchObject({ status: "FAILED", errorCode: "REDFOX_BAD_REQUEST" });
    await expect(db.sourceAsset.count({ where: { sourceItemId: source.id } })).resolves.toBe(0);
    await expect(db.transcript.findUnique({ where: { sourceItemId: source.id } })).resolves.toBeNull();
    await expect(db.apiUsage.count({ where: { workspaceId, provider: "REDFOX", operation: "PARSE_WORK", requestId: `${jobRecord.id}:1` } })).resolves.toBe(1);
  });
});
