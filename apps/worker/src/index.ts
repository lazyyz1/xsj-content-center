import { db } from "@content-center/db";
import { createServer } from "node:http";
import { createContentIngestWorker, createHealthWorker, createTranscribeSourceWorker } from "./queue";
import { cleanupExpiredAsrAudio } from "./transcription";

const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? "3010");
let ready = false;
const healthServer = createServer((request, response) => {
  if (request.url !== "/" && request.url !== "/health") {
    response.writeHead(404);
    response.end();
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  response.writeHead(ready ? 200 : 503, { "Content-Type": "application/json" });
  response.end(request.method === "HEAD" ? undefined : JSON.stringify({ status: ready ? "READY" : "STARTING" }));
});
healthServer.listen(healthPort, "127.0.0.1");

const worker = createHealthWorker();
const ingestWorker = createContentIngestWorker();
const transcriptionWorker = createTranscribeSourceWorker();
// Reflect terminal queue failures (including lost/stalled workers) in the persisted UI state.
for (const processor of [ingestWorker, transcriptionWorker]) processor.on("failed", (job, error) => {
  if (!job || !("jobId" in job.data)) return;
  const terminal = job.attemptsMade >= (job.opts.attempts || 1) || /stalled|unrecoverable/iu.test(error.message) || error.name === "UnrecoverableError";
  if (!terminal) return;
  const data = job.data;
  void db.$transaction(async tx => {
    const changed = await tx.ingestJob.updateMany({ where: { id: data.jobId, workspaceId: data.workspaceId, status: { in: ["QUEUED","RUNNING"] } }, data: { status: "FAILED", errorCode: "WORKER_INTERRUPTED", errorMessage: "后台任务中断，请重试。已保存资料不会丢失。", finishedAt: new Date() } });
    if (changed.count && job.name === "CONTENT_INGEST") await tx.sourceItem.updateMany({where:{id:data.sourceItemId,workspaceId:data.workspaceId,status:{in:["PENDING","PROCESSING"]}},data:{status:"FAILED"}});
    if (changed.count) await tx.sourceAsset.updateMany({where:{sourceItemId:data.sourceItemId,workspaceId:data.workspaceId,status:"DOWNLOADING"},data:{status:"FAILED"}});
  }).catch(() => console.warn("JOB_FAILURE_STATE_UPDATE_FAILED"));
});
await Promise.all([worker.waitUntilReady(), ingestWorker.waitUntilReady(), transcriptionWorker.waitUntilReady()]);
ready = true;
console.info("WORKER_CONNECTED");

const audioCleanupTimer = setInterval(() => {
  void cleanupExpiredAsrAudio().catch(() => console.warn("ASR_AUDIO_CLEANUP_RUN_FAILED"));
}, 60 * 60 * 1_000);
audioCleanupTimer.unref();

async function shutdown() {
  ready = false;
  clearInterval(audioCleanupTimer);
  await new Promise<void>((resolve) => {
    if (!healthServer.listening) {
      resolve();
      return;
    }
    healthServer.close(() => resolve());
  });
  await Promise.all([worker.close(), ingestWorker.close(), transcriptionWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
